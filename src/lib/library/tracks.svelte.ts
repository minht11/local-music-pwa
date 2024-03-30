import { type DBChangeRecord, notifyAboutDatabaseChanges } from '$lib/db/channel'
import { createQuery, deleteCacheValue } from '$lib/db/db-fast.svelte'
import { type AppDB, type AppStoreNames, getDB, getValue } from '$lib/db/get-db'
import type { IDBPTransaction, IndexNames } from 'idb'
import invariant from 'tiny-invariant'

const trackCacheKey = 'tracks'
const trackCacheIdKey = (id: number) => [trackCacheKey, id] as const

type LibraryStoreName = 'tracks' | 'albums' | 'artists'

export const removeTrackRelatedData = async <
	StoreName extends LibraryStoreName,
	EntityIndexName extends IndexNames<AppDB, StoreName>,
	EntityValue extends AppDB[StoreName]['indexes'][EntityIndexName],
	IndexName extends IndexNames<AppDB, 'tracks'>,
>(
	tx: IDBPTransaction<AppDB, ('tracks' | 'albums' | 'artists')[], 'readwrite'>,
	trackIndex: IndexName,
	entityStoreName: StoreName,
	entityIndex: EntityIndexName,
	entityValue?: EntityValue,
) => {
	if (!entityValue) {
		return
	}

	const tracksWithEntityCount = await tx.objectStore('tracks').index(trackIndex).count()

	if (tracksWithEntityCount > 1) {
		return
	}

	const store = tx.objectStore(entityStoreName)
	const entity = await store.index(entityIndex).get(IDBKeyRange.only(entityValue))

	if (!entity) {
		return
	}

	const change: DBChangeRecord = {
		storeName: entityStoreName,
		id: entity.id,
		operation: 'delete',
	}

	return change
}

export const removeTrack = async (id: number) => {
	const db = await getDB()

	deleteCacheValue(trackCacheIdKey(id))

	const tx = db.transaction(['tracks', 'albums', 'artists'], 'readwrite')
	const tracksStore = tx.objectStore('tracks')
	const track = await tracksStore.get(id)

	if (!track) {
		return
	}

	const [albumChange, ...artistsChanges] = await Promise.all([
		removeTrackRelatedData(tx, 'album', 'albums', 'name', track.album),
		...track.artists.map((artist) =>
			removeTrackRelatedData(tx, 'artists', 'artists', 'name', artist),
		),
	])

	await Promise.all([tracksStore.delete(id), tx.done])

	notifyAboutDatabaseChanges([
		{
			storeName: 'tracks',
			operation: 'delete',
			id,
		},
		albumChange,
		...artistsChanges,
	])
}

export interface UseTrackOptions<AllowEmpty extends boolean = false> {
	allowEmpty?: AllowEmpty
}

export type UseLibraryEntityResult<
	StoreName extends AppStoreNames,
	AllowEmpty extends boolean = false,
> = AllowEmpty extends true ? AppDB[StoreName]['value'] | undefined : AppDB[StoreName]['value']

export const createLibraryEntityQuery =
	<StoreName extends AppStoreNames>(storeName: StoreName) =>
	<AllowEmpty extends boolean = false>(
		id: number | (() => number),
		options: UseTrackOptions<AllowEmpty> = {},
	) =>
		createQuery({
			key: () => [storeName, typeof id === 'function' ? id() : id] as const,
			fetcher: async ([, id]) => {
				const entity = await getValue(storeName, id)

				if (options.allowEmpty) {
					return entity as AppDB[StoreName]['value']
				}

				invariant(entity, `${storeName} with id ${id} not found`)

				return entity
			},
			onDatabaseChange: (changes, { mutate }) => {
				for (const change of changes) {
					if (change.storeName !== storeName) {
						continue
					}

					if (change.operation === 'delete' && change.id === id) {
						mutate(undefined)
					}

					if (change.operation === 'update' && change.id === id) {
						mutate(change.value as AppDB[StoreName]['value'])
					}
				}
			},
		})

export const useTrack = createLibraryEntityQuery('tracks')
export const useAlbum = createLibraryEntityQuery('albums')
export const useArtist = createLibraryEntityQuery('artists')

export const getAlbumByTrackId = async (albumName?: string) => {
	const db = await getDB()

	if (!albumName) {
		return undefined
	}

	const album = await db.getFromIndex('albums', 'name', albumName)

	console.log('album', album)

	return album
}

export const getArtistByName = async (artistName?: string) => {
	const db = await getDB()

	if (!artistName) {
		return undefined
	}

	const artist = await db.getFromIndex('artists', 'name', artistName)

	console.log('artist', artist)

	return artist
}