import { FAVORITE_PLAYLIST_ID } from '$lib/library/playlists.svelte.ts'
import { WeakLRUCache } from 'weak-lru-cache'
import { type DBChangeRecord, listenForDatabaseChanges } from './channel.ts'
import type { Album, Artist, Playlist, Track } from './database-types.ts'
import { type DbKey, getDB } from './get-db.ts'
import { type LoaderResult, createLoader } from './queries.svelte.ts'

type LoaderMutate<Result, InitialResult extends Result | undefined> = (
	value: Result | ((prev: Result | InitialResult) => void),
) => void

export type DatabaseChangeHandler<Result> = (
	id: number,
	changes: DBChangeRecord,
	mutate: LoaderMutate<Result | undefined, undefined>,
) => void

interface QueryConfig<Result> {
	fetch: (id: number) => Promise<Result | undefined>
	onDatabaseChange?: DatabaseChangeHandler<Result | undefined>
}

export type LibraryEntityStoreName = 'tracks' | 'albums' | 'artists' | 'playlists'

type EntityCacheKey<Name extends LibraryEntityStoreName> = `${Name}:${string}`

const getEntityCacheKey = <Name extends LibraryEntityStoreName>(
	storeName: Name,
	key: DbKey<Name>,
): EntityCacheKey<Name> => `${storeName}:${key}`

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
	onDatabaseChange: (id, change, mutate) => {
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
			return
		}

		if (change.operation === 'delete') {
			mutate(undefined)
		} else if (change.operation === 'update') {
			mutate((prev) => {
				if (!prev) {
					return prev
				}

				return {
					...change.value,
					favorite: prev.favorite,
				}
			})
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
}

export interface ArtistData extends Artist {
	// TODO. Do we even need type field?
	type: 'artist'
}

// TODO. Reuse query config
const artistConfig: QueryConfig<ArtistData> = {
	fetch: async (id) => {
		const db = await getDB()
		const entity = await db.get('artists', id)

		if (!entity) {
			return undefined
		}

		return {
			...entity,
			type: 'artist',
		}
	},
}

export interface PlaylistData extends Playlist {
	type: 'playlist'
}

const playlistsConfig: QueryConfig<PlaylistData> = {
	fetch: async (id) => {
		if (id === FAVORITE_PLAYLIST_ID) {
			return {
				type: 'playlist',
				id: FAVORITE_PLAYLIST_ID,
				name: 'Favorites',
				created: 0,
			}
		}

		const db = await getDB()
		const entity = await db.get('playlists', id)

		if (!entity) {
			return undefined
		}

		return {
			...entity,
			type: 'playlist',
		}
	},
}

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
	EntityCacheKey<LibraryEntityStoreName>,
	QueryValue[keyof QueryValue] | Promise<QueryValue[keyof QueryValue]>
>({
	cacheSize: 10_000,
})

if (!import.meta.env.SSR) {
	type Value = QueryValue[LibraryEntityStoreName]
	type MutateCallback = Value | undefined | ((prev: Value | undefined) => Value)
	const mutateFn = (key: EntityCacheKey<LibraryEntityStoreName>, v: MutateCallback) => {
		let value = entityCache.getValue(key) as Value
		if (typeof v === 'function') {
			const accessor = v as (prev: Value | undefined) => Value
			value = accessor(value)
		}

		if (value) {
			entityCache.setValue(key, value)
		} else {
			entityCache.delete(key)
		}
	}

	listenForDatabaseChanges((changes) => {
		for (const key of entityCache.keys()) {
			const [storeName, stringId] = key.split(':') as [LibraryEntityStoreName, string]
			const id = Number(stringId)

			const onDatabaseChange = LIBRARY_ENTITIES_DATA_MAP[storeName].onDatabaseChange
			const mutate = mutateFn.bind(null, key)

			for (const change of changes) {
				if (onDatabaseChange) {
					onDatabaseChange(id, change, mutate)
					continue
				}

				if (change.storeName !== storeName || change.key !== id) {
					continue
				}

				if (change.operation === 'delete') {
					mutate(undefined)
				} else if (change.operation === 'update') {
					if (import.meta.env.DEV && storeName === 'tracks') {
						console.warn('Basic update operation should not be used for tracks')
					}

					mutate(change.value as Exclude<Value, Track>)
				}
			}
		}
	})
}

export const preloadLibraryEntityData = async (storeName: LibraryEntityStoreName, id: number) => {
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

const getLibraryEntityDataInternal = async <
	StoreName extends LibraryEntityStoreName,
	AllowEmpty extends boolean = false,
>(
	storeName: StoreName,
	id: number,
	config: (typeof LIBRARY_ENTITIES_DATA_MAP)[StoreName],
	allowEmpty?: AllowEmpty,
) => {
	type Value = LibraryEntityData<StoreName, AllowEmpty>

	const key = getEntityCacheKey(storeName, id)
	const cachedValue = entityCache.getValue(key) as Value

	if (cachedValue) {
		return cachedValue
	}

	const promise = config
		.fetch(id)
		.then((value) => {
			if (value) {
				entityCache.setValue(key, value)
			} else if (!allowEmpty) {
				throw new Error(`${storeName} with id ${id} not found`)
			}

			return value as Value
		})
		.catch((error) => {
			entityCache.delete(key)
			throw error
		})

	entityCache.setValue(key, promise as Promise<TrackData>)

	return promise
}

export const getLibraryEntityData = <
	StoreName extends LibraryEntityStoreName,
	AllowEmpty extends boolean = false,
>(
	storeName: StoreName,
	id: number,
	options: UseTrackOptions<AllowEmpty> = {},
): Promise<LibraryEntityData<StoreName, AllowEmpty>> => {
	const config = LIBRARY_ENTITIES_DATA_MAP[storeName]

	return getLibraryEntityDataInternal(storeName, id, config, options.allowEmpty)
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

		return createLoader({
			eager: true,
			key: idGetter,
			fetcher: (id) =>
				getLibraryEntityDataInternal(storeName, id, config, options.allowEmpty),
			onDatabaseChange: (_, { refetch }) => {
				// It is fine to refetch because value almost always will be in cache
				void refetch()
			},
		})
	}

export const useTrackData = createLibraryEntityLoader('tracks')
export const useAlbumData = createLibraryEntityLoader('albums')
export const useArtistData = createLibraryEntityLoader('artists')
export const usePlaylistData = createLibraryEntityLoader('playlists')
