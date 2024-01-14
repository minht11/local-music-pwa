import { notifyAboutDatabaseChanges } from '$lib/db/channel'
import { createQuery, deleteCacheValue } from '$lib/db/db-fast.svelte'
import { type AppDB, type AppStoreNames, getDB, getValue } from '$lib/db/get-db'
import invariant from 'tiny-invariant'

const trackCacheKey = 'tracks'
const trackCacheIdKey = (id: number) => [trackCacheKey, id] as const

export const removeTrack = async (id: number) => {
	const db = await getDB()

	deleteCacheValue(trackCacheIdKey(id))

	await db.delete('tracks', id)

	notifyAboutDatabaseChanges([
		{
			storeName: 'tracks',
			operation: 'delete',
			id,
		},
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
