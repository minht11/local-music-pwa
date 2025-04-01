import { type DbKey, getDatabase } from '$lib/db/database.ts'
import type { Album, Artist, Playlist, Track } from '$lib/db/database-types.ts'
import { type DatabaseChangeDetails, onDatabaseChange } from '$lib/db/listener.ts'
import type { QueryMutate } from '$lib/db/query/base-query.svelte.ts'
import { WeakLRUCache } from 'weak-lru-cache'
import { FAVORITE_PLAYLIST_ID, type LibraryItemStoreName } from '../types.ts'

type ConfigDatabaseChangeHandler<Result> = (
	id: number,
	changes: DatabaseChangeDetails,
	mutate: QueryMutate<Result | undefined>,
) => void

interface QueryConfig<Result> {
	fetch: (id: number) => Promise<Result | undefined>
	onDatabaseChange: ConfigDatabaseChangeHandler<Result>
}

type CacheKey<Store extends LibraryItemStoreName> = `${Store}:${string}`

const getCacheKey = <Store extends LibraryItemStoreName>(
	storeName: Store,
	key: DbKey<Store>,
): CacheKey<Store> => `${storeName}:${key}`

export interface TrackData extends Track {
	favorite: boolean
}

const trackConfig: QueryConfig<TrackData> = {
	fetch: async (id) => {
		const db = await getDatabase()
		const tx = db.transaction(['tracks', 'playlistsTracks'], 'readonly')

		const [item, favorite] = await Promise.all([
			tx.objectStore('tracks').get(id),
			tx.objectStore('playlistsTracks').get([FAVORITE_PLAYLIST_ID, id]),
		])

		if (!item) {
			return undefined
		}

		return {
			...item,
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

			return
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

const albumConfig: QueryConfig<AlbumData> = {
	fetch: async (id) => {
		const db = await getDatabase()
		const item = db.get('albums', id)

		return item
	},
	onDatabaseChange: (id, change, mutate) => {
		//  TODO. ADD onDatabaseChange
	},
}

export type ArtistData = Artist

// TODO. Reuse query config
const artistConfig: QueryConfig<ArtistData> = {
	fetch: async (id) => {
		const db = await getDatabase()
		return db.get('artists', id)
	},
	onDatabaseChange: (id, change, mutate) => {
		//  TODO. ADD onDatabaseChange
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

		const db = await getDatabase()
		return db.get('playlists', id)
	},
	onDatabaseChange: (id, change, mutate) => {
		//  TODO. ADD onDatabaseChange
	},
}

interface LibraryItemsConfigMap {
	tracks: QueryConfig<TrackData>
	albums: QueryConfig<AlbumData>
	artists: QueryConfig<ArtistData>
	playlists: QueryConfig<PlaylistData>
}

const libraryItemsConfigMap: LibraryItemsConfigMap = {
	tracks: trackConfig,
	albums: albumConfig,
	artists: artistConfig,
	playlists: playlistsConfig,
} as const

type LibraryItemsValueMap = {
	[Store in LibraryItemStoreName]: LibraryItemsConfigMap[Store] extends QueryConfig<infer T>
		? T
		: never
}

type LibraryItemValue = LibraryItemsValueMap[LibraryItemStoreName]

// Fast in memory cache for `items`, so we do not need to
// call indexed db for every access.
// IMPORTANT. Only store whole library items in` dataCache`
const dataCache = new WeakLRUCache<
	CacheKey<LibraryItemStoreName>,
	LibraryItemValue | Promise<LibraryItemValue>
>({
	cacheSize: 10_000,
})

if (!import.meta.env.SSR) {
	type MutateCallback =
		| LibraryItemValue
		| undefined
		| ((prev: LibraryItemValue | undefined) => LibraryItemValue)
	const mutateFn = (key: CacheKey<LibraryItemStoreName>, v: MutateCallback) => {
		let value = dataCache.getValue(key) as LibraryItemValue
		if (typeof v === 'function') {
			const accessor = v as (prev: LibraryItemValue | undefined) => LibraryItemValue
			value = accessor(value)
		}

		if (value) {
			dataCache.setValue(key, value)
		} else {
			dataCache.delete(key)
		}
	}

	onDatabaseChange((changes) => {
		for (const key of dataCache.keys()) {
			const [storeName, stringId] = key.split(':') as [LibraryItemStoreName, string]
			const id = Number(stringId)

			const onDatabaseChange = libraryItemsConfigMap[storeName].onDatabaseChange
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
						console.warn('Update operation should not be used for tracks')
					}

					mutate(change.value as Exclude<LibraryItemValue, Track>)
				}
			}
		}
	})
}

export class LibraryItemNotFoundError extends Error {
	constructor(storeName: LibraryItemStoreName, id: number) {
		super(`${storeName} with id ${id} not found`)
		this.name = 'LibraryItemNotFound'
	}
}

const unwrapLibraryItemValue = <T, AllowEmpty extends boolean = false>(
	value: T,
	id: number,
	storeName: LibraryItemStoreName,
	allowEmpty?: AllowEmpty,
) => {
	if (!(value || allowEmpty)) {
		throw new LibraryItemNotFoundError(storeName, id)
	}

	return value
}

export type GetLibraryItemValueResult<
	Store extends LibraryItemStoreName,
	AllowEmpty extends boolean = false,
> = AllowEmpty extends true ? LibraryItemsValueMap[Store] | undefined : LibraryItemsValueMap[Store]

export const getLibraryItemValue = <
	Store extends LibraryItemStoreName,
	AllowEmpty extends boolean = false,
>(
	storeName: Store,
	id: number,
	allowEmpty?: AllowEmpty,
):
	| Promise<GetLibraryItemValueResult<Store, AllowEmpty>>
	| GetLibraryItemValueResult<Store, AllowEmpty> => {
	type Value = LibraryItemsValueMap[Store]

	const key = getCacheKey(storeName, id)
	const cachedValue = dataCache.getValue(key) as Value

	if (cachedValue) {
		if (cachedValue instanceof Promise) {
			return cachedValue.then((value: Value) =>
				unwrapLibraryItemValue(value, id, storeName, allowEmpty),
			)
		}

		return unwrapLibraryItemValue(cachedValue, id, storeName, allowEmpty)
	}

	const promise = libraryItemsConfigMap[storeName]
		.fetch(id)
		.then((value) => {
			return unwrapLibraryItemValue(value as Value, id, storeName, allowEmpty)
		})
		.catch((error) => {
			dataCache.delete(key)
			throw error
		})

	dataCache.setValue(key, promise)

	return promise
}

export const preloadLibraryItemValue = async (
	storeName: LibraryItemStoreName,
	id: number,
): Promise<void> => {
	try {
		// getLibraryItemValue will fetch data and store it inside cache
		await getLibraryItemValue(storeName, id)
	} catch {
		// Ignore
	}
}
