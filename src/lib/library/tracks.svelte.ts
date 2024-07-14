import { type DBChangeRecord, notifyAboutDatabaseChanges } from '$lib/db/channel'
import { createQuery, deleteCacheValue } from '$lib/db/db-fast.svelte'
import type { Track } from '$lib/db/entities'
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
	tx: IDBPTransaction<AppDB, ('directories' | 'tracks' | 'albums' | 'artists')[], 'readwrite'>,
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

export const removeTrackWithTx = async <
	Tx extends IDBPTransaction<
		AppDB,
		('directories' | 'tracks' | 'albums' | 'artists')[],
		'readwrite'
	>,
>(
	tx: Tx,
	trackId: number,
) => {
	deleteCacheValue(trackCacheIdKey(trackId))

	const tracksStore = tx.objectStore('tracks')
	const track = await tracksStore.get(trackId)

	if (!track) {
		return
	}

	const [albumChange, ...artistsChanges] = await Promise.all([
		removeTrackRelatedData(tx, 'album', 'albums', 'name', track.album),
		...track.artists.map((artist) =>
			removeTrackRelatedData(tx, 'artists', 'artists', 'name', artist),
		),
	])

	await tracksStore.delete(trackId)

	notifyAboutDatabaseChanges([
		{
			storeName: 'tracks',
			operation: 'delete',
			id: trackId,
		},
		albumChange,
		...artistsChanges,
	])
}

export const removeTrack = async (id: number) => {
	const db = await getDB()

	const tx = db.transaction(['tracks', 'albums', 'artists'], 'readwrite')
	removeTrackWithTx(tx, id)

	await tx.done
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
export const usePlaylist = createLibraryEntityQuery('playlists')

export const preloadTracks = async (ids: number[], count: number) => {
	const db = await getDB()
	const results: Track[] = []

	let index = 0
	for (const id of ids) {
		if (results.length >= count) {
			break
		}

		await db.get('tracks', id)
		index += 1
	}
}
