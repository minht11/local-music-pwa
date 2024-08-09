import { unwrap } from '$lib/helpers/utils/unwrap.ts'
import { FAVORITE_PLAYLIST_ID } from '$lib/library/playlists.svelte.ts'
import { WeakLRUCache } from 'weak-lru-cache'
import type { DBChangeRecordList } from './channel.ts'
import type { Album, Artist, Playlist, Track } from './entities.ts'
import { type DbKey, getDB } from './get-db.ts'
import { type LoaderResult, createLoader } from './queries.svelte.ts'

export type LoaderMutate<Result, InitialResult extends Result | undefined> = (
	value: Result | ((prev: Result | InitialResult) => void),
) => void

export type DatabaseChangeHandler<Result> = (
	id: number,
	changes: DBChangeRecordList,
	mutate: LoaderMutate<Result | undefined, undefined>,
) => void

export interface QueryConfig<Result> {
	fetch: (id: number) => Promise<Result | undefined>
	onDatabaseChange: DatabaseChangeHandler<Result | undefined>
}

type LibraryEntityStoreName = 'tracks' | 'albums' | 'artists' | 'playlists'

type EntityCacheKey<Name extends LibraryEntityStoreName> = `${Name}-${string}`

const getEntityCacheKey = <Name extends LibraryEntityStoreName>(
	storeName: Name,
	key: DbKey<Name>,
): EntityCacheKey<Name> => `${storeName}-${key}`

export interface TrackData extends Track {
	favorite: boolean
}

const trackConfig: QueryConfig<TrackData> = {
	fetch: async (id) => {
		const db = await getDB()
		const tx = db.transaction(['tracks', 'playlistsTracks'], 'readonly')

		const [entity, favorite] = await Promise.all([
			tx.objectStore('tracks').get(id),
			tx.objectStore('playlistsTracks').get([FAVORITE_PLAYLIST_ID, id]),
		])

		if (!entity) {
			return undefined
		}

		return {
			...entity,
			favorite: !!favorite,
		} as TrackData
	},
	onDatabaseChange: (id, changes, mutate) => {
		for (const change of changes) {
			if (change.storeName === 'playlistsTracks') {
				const [playlistId, trackId] = change.key

				if (playlistId === FAVORITE_PLAYLIST_ID && trackId === id) {
					const favorite = change.operation === 'add'

					mutate((prev) => {
						if (!prev) {
							return prev
						}

						return {
							...prev,
							favorite,
						}
					})
				}
			}

			if (change.storeName !== 'tracks' || change.key !== id) {
				continue
			}

			if (change.operation === 'delete') {
				mutate(undefined)
			} else if (change.operation === 'update') {
				mutate((prev) => {
					if (!prev) {
						return prev
					}

					// TODO. Clear cache

					return {
						...change.value,
						favorite: prev.favorite,
					}
				})
			}
		}
	},
}

export type AlbumData = Album

export const albumConfig: QueryConfig<AlbumData> = {
	fetch: async (id) => {
		const db = await getDB()
		const entity = db.get('albums', id)

		return entity
	},
	onDatabaseChange: (id, changes, mutate) => {
		for (const change of changes) {
			if (change.storeName !== 'albums' || change.key !== id) {
				continue
			}

			if (change.operation === 'delete') {
				mutate(undefined)
			} else if (change.operation === 'update') {
				mutate(change.value)
			}
		}
	},
}

export type ArtistData = Artist

// TODO. Reuse query config
const artistConfig: QueryConfig<ArtistData> = {
	fetch: async (id) => {
		const db = await getDB()
		const entity = db.get('artists', id)

		return entity
	},
	onDatabaseChange: (id, changes, mutate) => {
		for (const change of changes) {
			if (change.storeName !== 'artists' || change.key !== id) {
				continue
			}

			if (change.operation === 'delete') {
				mutate(undefined)
			} else if (change.operation === 'update') {
				mutate(change.value)
			}
		}
	},
}

export type PlaylistData = Playlist

const playlistsConfig: QueryConfig<PlaylistData> = {
	fetch: async (id) => {
		const db = await getDB()
		const entity = db.get('playlists', id)

		return entity
	},
	onDatabaseChange: (id, changes, mutate) => {
		for (const change of changes) {
			if (change.storeName !== 'playlists' || change.key !== id) {
				continue
			}

			if (change.operation === 'delete') {
				mutate(undefined)
			} else if (change.operation === 'update') {
				mutate(change.value)
			}
		}
	},
}

// TODO. Rename camelCase
const LIBRARY_ENTITIES_DATA_MAP = {
	tracks: trackConfig,
	albums: albumConfig,
	artists: artistConfig,
	playlists: playlistsConfig,
} as const

// TODO. Rename
type QueryValue = {
	[key in keyof typeof LIBRARY_ENTITIES_DATA_MAP]: Exclude<
		Awaited<ReturnType<(typeof LIBRARY_ENTITIES_DATA_MAP)[key]['fetch']>>,
		undefined
	>
}

// Fast in memory entityCache for `entities` we do not need to
// call indexed db for every access.
// IMPORTANT. Only store whole entities in entityCache instead of any value
// that can be accessed in query.
const entityCache = new WeakLRUCache<
	`${LibraryEntityStoreName}-${string}`,
	QueryValue[keyof QueryValue]
>({
	cacheSize: 10_000,
})

export const prefetchLibraryEntityData = async (storeName: LibraryEntityStoreName, id: number) => {
	try {
		// If we already have value in cache do not fetch it again
		const key = getEntityCacheKey(storeName, id)
		if (entityCache.has(key)) {
			return
		}

		const config = LIBRARY_ENTITIES_DATA_MAP[storeName]
		const result = await config.fetch(id)

		if (result) {
			entityCache.setValue(key, result)
		}
	} catch {
		// Ignore
	}
}

export interface UseTrackOptions<AllowEmpty extends boolean = false> {
	allowEmpty?: AllowEmpty
}

export type LibraryEntityData<
	StoreName extends LibraryEntityStoreName,
	AllowEmpty extends boolean = false,
> = AllowEmpty extends true ? QueryValue[StoreName] | undefined : QueryValue[StoreName]

const createLibraryEntityLoader =
	<StoreName extends LibraryEntityStoreName>(storeName: StoreName) =>
	<AllowEmpty extends boolean = false>(
		idGetter: number | (() => number),
		options: UseTrackOptions<AllowEmpty> = {},
	): LoaderResult<LibraryEntityData<StoreName, AllowEmpty>, undefined> => {
		const config = LIBRARY_ENTITIES_DATA_MAP[storeName]

		type Value = LibraryEntityData<StoreName, AllowEmpty>

		return createLoader({
			eager: true,
			key: idGetter,
			fetcher: (id) => {
				const key = getEntityCacheKey(storeName, id)
				const cachedValue = entityCache.getValue(key) as Value

				if (cachedValue) {
					return cachedValue
				}

				return config.fetch(id).then((value) => {
					if (value) {
						entityCache.setValue(key, value)
					} else if (!options.allowEmpty) {
						throw new Error(`${storeName} with id ${id} not found`)
					}

					return value as Value
				})
			},
			onDatabaseChange: (changes, { mutate }) => {
				// @ts-expect-error mutate type is not correct
				config.onDatabaseChange(unwrap(idGetter), changes, mutate)
			},
		})
	}

export const useTrackData = createLibraryEntityLoader('tracks')
export const useAlbumData = createLibraryEntityLoader('albums')
export const useArtistData = createLibraryEntityLoader('artists')
export const usePlaylistData = createLibraryEntityLoader('playlists')
