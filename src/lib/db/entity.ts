import { FAVORITE_PLAYLIST_ID } from '$lib/library/playlists.svelte.ts'
import { WeakLRUCache } from 'weak-lru-cache'
import { type DBChangeRecord, listenForDatabaseChanges } from './channel.ts'
import type { Album, Artist, Playlist, Track } from './database-types.ts'
import { type DbKey, getDB } from './get-db.ts'
import { type QueryResult, createQuery } from './query.svelte.ts'

type QueryMutate<Result, InitialResult extends Result | undefined> = (
	value: Result | ((prev: Result | InitialResult) => void),
) => void

export type DatabaseChangeHandler<Result> = (
	id: number,
	changes: DBChangeRecord,
	mutate: QueryMutate<Result | undefined, undefined>,
) => void

interface QueryConfig<Result> {
	fetch: (id: number) => Promise<Result | undefined>
	onDatabaseChange?: DatabaseChangeHandler<Result | undefined>
}

export type EntityStoreName = 'tracks' | 'albums' | 'artists' | 'playlists'

type EntityCacheKey<Name extends EntityStoreName> = `${Name}:${string}`

const getEntityCacheKey = <Name extends EntityStoreName>(
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

export type ArtistData = Artist

// TODO. Reuse query config
const artistConfig: QueryConfig<ArtistData> = {
	fetch: async (id) => {
		const db = await getDB()
		return db.get('artists', id)
	},
}

export type PlaylistData = Playlist

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
		return db.get('playlists', id)
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
	EntityCacheKey<EntityStoreName>,
	QueryValue[keyof QueryValue] | Promise<QueryValue[keyof QueryValue]>
>({
	cacheSize: 10_000,
})

if (!import.meta.env.SSR) {
	type Value = QueryValue[EntityStoreName]
	type MutateCallback = Value | undefined | ((prev: Value | undefined) => Value)
	const mutateFn = (key: EntityCacheKey<EntityStoreName>, v: MutateCallback) => {
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
			const [storeName, stringId] = key.split(':') as [EntityStoreName, string]
			const id = Number(stringId)

			const onDatabaseChange = LIBRARY_ENTITIES_DATA_MAP[storeName].onDatabaseChange
			const mutate = mutateFn.bind(null, key)

			for (const change of changes) {
				if (onDatabaseChange) {
					// TODO. Fix type
					// @ts-expect-error
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

export const preloadEntityData = async (storeName: EntityStoreName, id: number) => {
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

export type EntityQueryData<
	StoreName extends EntityStoreName,
	AllowEmpty extends boolean = false,
> = AllowEmpty extends true ? QueryValue[StoreName] | undefined : QueryValue[StoreName]

export interface EntityQueryOptions<AllowEmpty extends boolean = false> {
	allowEmpty?: AllowEmpty
}

const getEntityDataInternal = async <
	StoreName extends EntityStoreName,
	AllowEmpty extends boolean = false,
>(
	storeName: StoreName,
	id: number,
	config: (typeof LIBRARY_ENTITIES_DATA_MAP)[StoreName],
	allowEmpty?: AllowEmpty,
) => {
	type Value = EntityQueryData<StoreName, AllowEmpty>

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

export const getEntityData = <
	StoreName extends EntityStoreName,
	AllowEmpty extends boolean = false,
>(
	storeName: StoreName,
	id: number,
	options: EntityQueryOptions<AllowEmpty> = {},
): Promise<EntityQueryData<StoreName, AllowEmpty>> => {
	const config = LIBRARY_ENTITIES_DATA_MAP[storeName]

	return getEntityDataInternal(storeName, id, config, options.allowEmpty)
}

const defineEntityQuery =
	<StoreName extends EntityStoreName>(storeName: StoreName) =>
	<AllowEmpty extends boolean = false>(
		idGetter: number | (() => number),
		options: EntityQueryOptions<AllowEmpty> = {},
	): QueryResult<EntityQueryData<StoreName, AllowEmpty>, undefined> => {
		const config = LIBRARY_ENTITIES_DATA_MAP[storeName]

		return createQuery({
			eager: true,
			key: idGetter,
			fetcher: (id) => getEntityDataInternal(storeName, id, config, options.allowEmpty),
			onDatabaseChange: (_, { refetch }) => {
				// It is fine to refetch because value almost always will be in cache
				void refetch()
			},
		})
	}

export const createTrackQuery = defineEntityQuery('tracks')
export const createAlbumQuery = defineEntityQuery('albums')
export const createArtistQuery = defineEntityQuery('artists')
export const createPlaylistQuery = defineEntityQuery('playlists')
