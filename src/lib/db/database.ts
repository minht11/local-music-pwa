import type { DBSchema, IDBPDatabase, IDBPObjectStore, IndexNames, StoreNames } from 'idb'
import { openDB } from 'idb'
import type {
	Album,
	Artist,
	Directory,
	Playlist,
	PlaylistEntry,
	Track,
} from '$lib/library/types.ts'

export interface AppDB extends DBSchema {
	tracks: {
		key: number
		value: Track
		indexes: Pick<
			Track,
			| 'uuid'
			| 'name'
			| 'album'
			| 'year'
			| 'duration'
			| 'artists'
			| 'directory'
			| 'fileName'
			| 'scannedAt'
		> & {
			path: [directoryId: number, fileName: string]
		}
		meta: {
			notAllowedOperations: undefined
		}
	}
	albums: {
		key: number
		value: Album
		indexes: Pick<Album, 'uuid' | 'name' | 'artists' | 'year'>
		meta: {
			notAllowedOperations: undefined
		}
	}
	artists: {
		key: number
		value: Artist
		indexes: Pick<Artist, 'uuid' | 'name'>
		meta: {
			notAllowedOperations: undefined
		}
	}
	playlists: {
		key: number
		value: Playlist
		indexes: Pick<Playlist, 'uuid' | 'name' | 'createdAt'>
		meta: {
			notAllowedOperations: undefined
		}
	}
	playlistEntries: {
		key: number
		value: PlaylistEntry
		indexes: Pick<PlaylistEntry, 'playlistId' | 'trackId' | 'addedAt'> & {
			playlistTrack: [playlistId: number, trackId: number]
		}
		meta: {
			notAllowedOperations: 'update'
		}
	}
	directories: {
		key: number
		value: Directory
		indexes: Pick<Directory, 'id'>
		meta: {
			notAllowedOperations: undefined
		}
	}
}

export type AppStoreNames = StoreNames<AppDB>
export type AppIndexNames<Store extends AppStoreNames> = IndexNames<AppDB, Store>

const createIndexes = <Name extends AppStoreNames>(
	store: IDBPObjectStore<AppDB, ArrayLike<AppStoreNames>, Name, 'versionchange'>,
	indexes: readonly AppIndexNames<Name>[],
	options: IDBIndexParameters = {},
) => {
	for (const name of indexes) {
		store.createIndex(name, name, options)
	}
}

const createStore = <DBTypes extends DBSchema | unknown, Name extends StoreNames<DBTypes>>(
	db: IDBPDatabase<DBTypes>,
	storeName: Name,
) =>
	db.createObjectStore(storeName, {
		keyPath: 'id',
		autoIncrement: true,
	})

const openAppDatabase = () =>
	openDB<AppDB>('snae-app-data', 1, {
		upgrade(e) {
			const { objectStoreNames } = e

			if (!objectStoreNames.contains('tracks')) {
				const store = createStore(e, 'tracks')

				createIndexes(store, ['uuid'], { unique: true })
				createIndexes(
					store,
					['name', 'album', 'year', 'duration', 'scannedAt', 'directory'],
					{
						unique: false,
					},
				)

				store.createIndex('path', ['directory', 'fileName'], {
					// We keep flat folder structure in the database
					// but in actual FS multiple files with same name
					// can exist in different directories
					unique: false,
				})

				store.createIndex('artists', 'artists', {
					unique: false,
					multiEntry: true,
				})
			}

			if (!objectStoreNames.contains('albums')) {
				const store = createStore(e, 'albums')

				createIndexes(store, ['name', 'uuid'], { unique: true })
				createIndexes(store, ['year'])

				store.createIndex('artists', 'artists', {
					unique: false,
					multiEntry: true,
				})
			}

			if (!objectStoreNames.contains('artists')) {
				const store = createStore(e, 'artists')
				createIndexes(store, ['name', 'uuid'], { unique: true })
			}

			if (!objectStoreNames.contains('playlists')) {
				const store = createStore(e, 'playlists')
				createIndexes(store, ['uuid'], { unique: true })
				createIndexes(store, ['name', 'createdAt'])
			}

			if (!objectStoreNames.contains('playlistEntries')) {
				const store = e.createObjectStore('playlistEntries', {
					keyPath: 'id',
					autoIncrement: true,
				})

				createIndexes(store, ['playlistId', 'trackId', 'addedAt'])

				store.createIndex('playlistTrack', ['playlistId', 'trackId'])
			}

			if (!objectStoreNames.contains('directories')) {
				createStore(e, 'directories')
			}
		},
	})

type AppIDBDatabase = IDBPDatabase<AppDB>
let dbPromise: Promise<AppIDBDatabase> | AppIDBDatabase | null = null

export const getDatabase = (): Promise<AppIDBDatabase> | AppIDBDatabase => {
	if (dbPromise) {
		return dbPromise
	}

	dbPromise = openAppDatabase()

	dbPromise
		.then((db) => {
			db.onclose = () => {
				dbPromise = null
			}

			// Micro optimization to avoid unwrapping the promise
			dbPromise = db
		})
		.catch(() => {
			dbPromise = null
		})

	return dbPromise
}

export type DbKey<Name extends AppStoreNames> = AppDB[Name]['key']
export type DbValue<Name extends AppStoreNames> = AppDB[Name]['value']
