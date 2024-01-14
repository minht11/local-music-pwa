import { type DBChangeRecord, notifyAboutDatabaseChanges } from '$lib/db/channel'
import { createQuery, deleteCacheValue } from '$lib/db/db-fast.svelte'
import { type AppDB, type AppStoreNames, getDB, getValue } from '$lib/db/get-db'
import type { IDBPTransaction } from 'idb'
import invariant from 'tiny-invariant'

const trackCacheKey = 'tracks'
const trackCacheIdKey = (id: number) => [trackCacheKey, id] as const

const removeAlbum = async (
	tx: IDBPTransaction<AppDB, ('tracks' | 'albums')[], 'readwrite'>,
	name?: string,
) => {
	if (!name) {
		return
	}

	const store = tx.objectStore('albums')
	const album = await store.index('name').get(name)

	if (!album) {
		return
	}

	const { id } = album

	await store.delete(id)

	const change: DBChangeRecord = {
		storeName: 'albums',
		id,
		operation: 'delete',
	}

	return change
}

export const removeTrack = async (id: number) => {
	const db = await getDB()

	deleteCacheValue(trackCacheIdKey(id))

	const tx = db.transaction(['tracks', 'albums'], 'readwrite')
	const tracksStore = tx.objectStore('tracks')
	const track = await tracksStore.get(id)

	if (!track) {
		return
	}

	const tracksWithSameAlbumCount = await tracksStore.index('album').count(track.album)

	const [albumChange] = await Promise.all([
		tracksWithSameAlbumCount === 1 ? removeAlbum(tx, track.album) : undefined,
		tracksStore.delete(id),
		tx.done,
	])

	notifyAboutDatabaseChanges([
		{
			storeName: 'tracks',
			operation: 'delete',
			id,
		},
		albumChange,
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
