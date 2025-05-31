import { type DbKey, getDatabase } from '$lib/db/database.ts'
import { type DatabaseChangeDetails, onDatabaseChange } from '$lib/db/events.ts'
import type { Album, Artist, Playlist, Track } from '$lib/library/types.ts'
import { WeakLRUCache } from 'weak-lru-cache'
import { FAVORITE_PLAYLIST_ID, FAVORITE_PLAYLIST_UUID, type LibraryStoreName } from '../types.ts'

type CacheKey<Store extends LibraryStoreName> = `${Store}:${string}`

const getCacheKey = <Store extends LibraryStoreName>(
	storeName: Store,
	key: DbKey<Store>,
): CacheKey<Store> => `${storeName}:${key}`

interface QueryConfig<Result> {
	fetch: (id: number) => Promise<Result | undefined>
	shouldRefetch: (
		itemId: number | undefined,
		changes: readonly DatabaseChangeDetails[],
	) => boolean
}

const defaultRefreshOnDatabaseChanges = (
	storeName: LibraryStoreName,
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
	type: 'track'
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
			type: 'track',
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
		// We clear our existing cache and just let refetch happen when getLibraryValue is called again
		const cacheKey = getCacheKey('tracks', change.key)
		valueCache.delete(cacheKey)
	}
}

const dbGetValue = async <Store extends LibraryStoreName, const T extends string>(
	storeName: Store,
	type: T,
	id: number,
) => {
	const db = await getDatabase()
	const value = await db.get(storeName, id)
	if (!value) {
		return undefined
	}

	return {
		...value,
		type,
	}
}

export interface AlbumData extends Album {
	type: 'album'
}

const albumConfig: QueryConfig<AlbumData> = {
	fetch: (id) => dbGetValue('albums', 'album', id),
	shouldRefetch: defaultRefreshOnDatabaseChanges.bind(null, 'albums'),
}
export interface ArtistData extends Artist {
	type: 'artist'
}

const artistConfig: QueryConfig<ArtistData> = {
	fetch: (id) => dbGetValue('artists', 'artist', id),
	shouldRefetch: defaultRefreshOnDatabaseChanges.bind(null, 'artists'),
}

export interface PlaylistData extends Playlist {
	type: 'playlist'
}

const playlistsConfig: QueryConfig<PlaylistData> = {
	fetch: (id) => {
		if (id === FAVORITE_PLAYLIST_ID) {
			const favoritePlaylist: PlaylistData = {
				type: 'playlist',
				id: FAVORITE_PLAYLIST_ID,
				uuid: FAVORITE_PLAYLIST_UUID,
				name: 'Favorites',
				createdAt: 0,
			}

			return Promise.resolve(favoritePlaylist)
		}

		return dbGetValue('playlists', 'playlist', id)
	},
	shouldRefetch: defaultRefreshOnDatabaseChanges.bind(null, 'playlists'),
}

interface LibraryValueMap {
	tracks: TrackData
	albums: AlbumData
	artists: ArtistData
	playlists: PlaylistData
}

type LibraryValue<Store extends LibraryStoreName = LibraryStoreName> = LibraryValueMap[Store]

type LibraryConfigMap = {
	[Store in LibraryStoreName]: QueryConfig<LibraryValue<Store>>
}

const libraryConfigMap = {
	tracks: trackConfig,
	albums: albumConfig,
	artists: artistConfig,
	playlists: playlistsConfig,
} satisfies LibraryConfigMap

type LibraryCachedValue<Store extends LibraryStoreName = LibraryStoreName> =
	| LibraryValue<Store>
	| Promise<LibraryValue<Store> | undefined>

class LibraryValueCache {
	#cache = new WeakLRUCache<CacheKey<LibraryStoreName>, LibraryCachedValue<LibraryStoreName>>({
		cacheSize: 10_000,
	})

	get<Store extends LibraryStoreName>(key: CacheKey<Store>) {
		return this.#cache.getValue(key) as LibraryCachedValue<Store> | undefined
	}

	set<Store extends LibraryStoreName>(
		key: CacheKey<Store>,
		value: LibraryCachedValue<Store> | undefined,
	) {
		if (value) {
			this.#cache.setValue(key, value)
		} else {
			this.delete(key)
		}
	}

	delete<Store extends LibraryStoreName>(key: CacheKey<Store>) {
		this.#cache.delete(key)
	}
}

// Fast in memory cache for `items`, so we do not need to
// call indexed db for every access.
// IMPORTANT. Only store whole library items in here.
const valueCache = new LibraryValueCache()

if (import.meta.env.DEV) {
	// @ts-expect-error used for debugging
	globalThis.libraryValueCache = valueCache
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

export class LibraryValueNotFoundError extends Error {
	constructor(cacheKey: CacheKey<LibraryStoreName>) {
		super(`Value not found. Cache key: ${cacheKey}`)
		this.name = 'LibraryValueNotFoundError'
	}
}

const emptyValue = <T, AllowEmpty extends boolean = false>(
	value: T,
	allowEmpty: AllowEmpty | undefined,
	cacheKey: CacheKey<LibraryStoreName>,
) => {
	if (!(value || allowEmpty)) {
		throw new LibraryValueNotFoundError(cacheKey)
	}

	return value
}

/** @private */
export const getCachedOrFetchValue = <Store extends LibraryStoreName>(
	key: CacheKey<Store>,
	fetchValue: () => Promise<LibraryValueMap[Store] | undefined>,
): LibraryValue<Store> | Promise<LibraryValue<Store> | undefined> => {
	const cachedValue = valueCache.get(key)
	if (cachedValue) {
		return cachedValue
	}

	const promise = fetchValue()
		.then((value) => {
			valueCache.set(key, value)

			return value
		})
		.catch((error) => {
			valueCache.delete(key)
			throw error
		})

	valueCache.set(key, promise)

	return promise
}

export type GetLibraryValueResult<
	Store extends LibraryStoreName,
	AllowEmpty extends boolean = false,
> = AllowEmpty extends true ? LibraryValue<Store> | undefined : LibraryValue<Store>

/** @public */
export const getLibraryValue = <Store extends LibraryStoreName, AllowEmpty extends boolean = false>(
	storeName: Store,
	id: number,
	allowEmpty?: AllowEmpty,
): Promise<GetLibraryValueResult<Store, AllowEmpty>> | GetLibraryValueResult<Store, AllowEmpty> => {
	const key = getCacheKey(storeName, id)
	const result = getCachedOrFetchValue(key, () => {
		const config: LibraryConfigMap[Store] = libraryConfigMap[storeName]

		return config.fetch(id)
	})

	if (result instanceof Promise) {
		const promiseResult = result.then((value) => emptyValue(value, allowEmpty, key)) as Promise<
			GetLibraryValueResult<Store, AllowEmpty>
		>

		return promiseResult
	}

	return emptyValue(result, allowEmpty, key)
}

/** @public */
export const preloadLibraryValue = async (
	storeName: LibraryStoreName,
	id: number,
): Promise<void> => {
	try {
		// this will fetch data and store it inside cache
		await getLibraryValue(storeName, id)
	} catch {
		// Ignore
	}
}

export const shouldRefetchLibraryValue = (
	storeName: LibraryStoreName,
	id: number | undefined,
	changes: readonly DatabaseChangeDetails[],
): boolean => {
	const config = libraryConfigMap[storeName]

	return config.shouldRefetch(id, changes)
}
