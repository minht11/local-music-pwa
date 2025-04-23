import { type DbKey, getDatabase } from '$lib/db/database.ts'
import { type DatabaseChangeDetails, onDatabaseChange } from '$lib/db/events.ts'
import type { Album, Artist, Playlist, Track } from '$lib/library/types.ts'
import { WeakLRUCache } from 'weak-lru-cache'
import {
	FAVORITE_PLAYLIST_ID,
	FAVORITE_PLAYLIST_UUID,
	type LibraryItemStoreName,
} from '../types.ts'

type CacheKey<Store extends LibraryItemStoreName> = `${Store}:${string}`

const getCacheKey = <Store extends LibraryItemStoreName>(
	storeName: Store,
	key: DbKey<Store>,
): CacheKey<Store> => `${storeName}:${key}`

interface QueryConfig<Result> {
	fetch: (id: number) => Promise<Result | undefined>
	shouldRefetch: (itemId: number | undefined, changes: readonly DatabaseChangeDetails[]) => boolean
}

const defaultRefreshOnDatabaseChanges = (
	storeName: LibraryItemStoreName,
	itemId: number | undefined,
	changes: readonly DatabaseChangeDetails[],
) => {
	for (const change of changes) {
		if (change.storeName === storeName) {
			if (itemId === null) {
				return true
			}

			if (change.key === itemId) {
				return true
			}
		}
	}

	return false
}

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
			tx.done,
		])

		if (!item) {
			return undefined
		}

		return {
			...item,
			favorite: !!favorite,
		} as TrackData
	},
	shouldRefetch: (itemId, changes) => {
		for (const change of changes) {
			if (change.storeName === 'playlistsTracks') {
				const [playlistId, trackId] = change.key

				if (playlistId === FAVORITE_PLAYLIST_ID && itemId === trackId) {
					return true
				}
			}

			if (change.storeName === 'tracks' && change.key === itemId) {
				return true
			}
		}

		return false
	},
}

const tracksDataDatabaseChangeHandler = (change: DatabaseChangeDetails) => {
	if (change.storeName === 'playlistsTracks') {
		const [playlistId, trackId] = change.key

		if (playlistId === FAVORITE_PLAYLIST_ID) {
			const cacheKey = getCacheKey('tracks', trackId)
			valueCache.delete(cacheKey)
		}
	}

	if (
		(change.storeName === 'tracks' && change.operation === 'delete') ||
		change.operation === 'update'
	) {
		// We clear our existing cache and just let refetch happen when getLibraryItemValue is called again
		const cacheKey = getCacheKey('tracks', change.key)
		valueCache.delete(cacheKey)
	}
}

export type AlbumData = Album

const albumConfig: QueryConfig<AlbumData> = {
	fetch: async (id) => {
		const db = await getDatabase()
		return db.get('albums', id)
	},
	shouldRefetch: defaultRefreshOnDatabaseChanges.bind(null, 'albums'),
}

export type ArtistData = Artist

const artistConfig: QueryConfig<ArtistData> = {
	fetch: async (id) => {
		const db = await getDatabase()
		return db.get('artists', id)
	},
	shouldRefetch: defaultRefreshOnDatabaseChanges.bind(null, 'artists'),
}

export type PlaylistData = Playlist

const playlistsConfig: QueryConfig<PlaylistData> = {
	fetch: async (id) => {
		if (id === FAVORITE_PLAYLIST_ID) {
			return {
				type: 'playlist',
				id: FAVORITE_PLAYLIST_ID,
				uuid: FAVORITE_PLAYLIST_UUID,
				name: 'Favorites',
				createdAt: 0,
			}
		}

		const db = await getDatabase()
		return db.get('playlists', id)
	},
	shouldRefetch: defaultRefreshOnDatabaseChanges.bind(null, 'playlists'),
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
// IMPORTANT. Only store whole library items in here.
const valueCache = new WeakLRUCache<
	CacheKey<LibraryItemStoreName>,
	LibraryItemValue | Promise<LibraryItemValue>
>({
	cacheSize: 10_000,
})

if (import.meta.env.DEV) {
	// @ts-expect-error used for debugging
	globalThis.libraryItemCache = valueCache
}

if (!import.meta.env.SSR) {
	onDatabaseChange((changes) => {
		for (const change of changes) {
			const { storeName } = change

			if (storeName === 'albums' || storeName === 'artists' || storeName === 'playlists') {
				if (change.operation === 'delete' || change.operation === 'update') {
					const cacheKey = getCacheKey(storeName, change.key)
					valueCache.delete(cacheKey)
				}
			}

			tracksDataDatabaseChangeHandler(change)
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

/** @private */
export const getCachedOrFetchValue = <Store extends LibraryItemStoreName>(
	key: CacheKey<Store>,
	fetchValue: () => Promise<LibraryItemsValueMap[Store] | undefined>,
): Promise<GetLibraryItemValueResult<Store, true>> | GetLibraryItemValueResult<Store, true> => {
	const cachedValue = valueCache.getValue(key)


	// @ts-expect-error aa
	return cachedValue
	// if (cachedValue) {
	// 	return cachedValue
	// }

	// const promise = fetchValue()
	// 	.then((value) => {
	// 		if (value) {
	// 			valueCache.setValue(key, value)
	// 		} else {
	// 			valueCache.delete(key)
	// 		}

	// 		return value
	// 	})
	// 	.catch((error) => {
	// 		valueCache.delete(key)
	// 		throw error
	// 	})

	// valueCache.setValue(key, promise)

	// return promise
}

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
	const result = getCachedOrFetchValue(key, () => libraryItemsConfigMap[storeName].fetch(id))

	return result
}

export const preloadLibraryItemValue = async (
	storeName: LibraryItemStoreName,
	id: number,
): Promise<void> => {
	try {
		console.log('Preloading', storeName, id)
		// getLibraryItemValue will fetch data and store it inside cache
		await getLibraryItemValue(storeName, id)
	} catch {
		// Ignore
	}
}

export const shouldRefetchLibraryItemValue = (
	storeName: LibraryItemStoreName,
	id: number | undefined,
	changes: readonly DatabaseChangeDetails[],
): boolean => {
	const config = libraryItemsConfigMap[storeName]
	if (!config) {
		return false
	}

	return config.shouldRefetch(id, changes)
}
