import type { DBSchema, IDBPDatabase, IDBPObjectStore, IndexNames, StoreNames } from 'idb'
import { openDB } from 'idb'
import type {
	Album,
	Artist,
	Directory,
	PlayHistoryEntry,
	Playlist,
	PlaylistEntry,
	Track,
} from '$lib/library/types.ts'
import type { DbStandardOperation, DbStandardOperations } from './events.ts'

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
			byAlbumSorted: [album: string, name: string, trackNo: number, discNo: number]
		}
		meta: {
			operations: DbStandardOperations<'tracks'>
		}
	}
	albums: {
		key: number
		value: Album
		indexes: Pick<Album, 'uuid' | 'name' | 'artists' | 'year'>
		meta: {
			operations: DbStandardOperations<'albums'>
		}
	}
	artists: {
		key: number
		value: Artist
		indexes: Pick<Artist, 'uuid' | 'name'>
		meta: {
			operations: DbStandardOperations<'artists'>
		}
	}
	playlists: {
		key: number
		value: Playlist
		indexes: Pick<Playlist, 'uuid' | 'name' | 'createdAt'>
		meta: {
			operations: DbStandardOperations<'playlists'>
		}
	}
	playlistEntries: {
		key: number
		value: PlaylistEntry
		indexes: Pick<PlaylistEntry, 'playlistId' | 'trackId' | 'addedAt'> & {
			playlistTrack: [playlistId: number, trackId: number]
		}
		meta: {
			operations:
				| DbStandardOperation<'playlistEntries', 'add', true>
				| DbStandardOperation<'playlistEntries', 'delete', true>
		}
	}
	directories: {
		key: number
		value: Directory
		indexes: Pick<Directory, 'id'>
		meta: {
			operations: DbStandardOperations<'directories'>
		}
	}
	playHistory: {
		key: number
		value: PlayHistoryEntry
		indexes: Pick<PlayHistoryEntry, 'trackId' | 'playedAt'>
		meta: {
			operations: {
				storeName: 'playHistory'
				operation: 'change'
			}
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
	openDB<AppDB>('snae-app-data', 3, {
		async upgrade(db, oldVersion, _newVersion, tx) {
			const { objectStoreNames } = db

			if (!objectStoreNames.contains('tracks')) {
				const store = createStore(db, 'tracks')

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

			const tracksStore = tx.objectStore('tracks')
			if (!tracksStore.indexNames.contains('byAlbumSorted')) {
				tx.objectStore('tracks').createIndex(
					'byAlbumSorted',
					['album', 'discNo', 'trackNo', 'name'],
					{
						unique: false,
					},
				)
			}

			if (oldVersion === 1) {
				// Previous versions didn't have discNo and trackNo fields
				for await (const cursor of tracksStore) {
					const track = cursor.value
					if (track.discNo === undefined || track.trackNo === undefined) {
						await cursor.update({
							...track,
							discNo: track.discNo ?? 0,
							discOf: track.discOf ?? 0,
							trackNo: track.trackNo ?? 0,
							trackOf: track.trackOf ?? 0,
						})
					}
				}
			}

			if (!objectStoreNames.contains('albums')) {
				const store = createStore(db, 'albums')

				createIndexes(store, ['name', 'uuid'], { unique: true })
				createIndexes(store, ['year'])

				store.createIndex('artists', 'artists', {
					unique: false,
					multiEntry: true,
				})
			}

			if (!objectStoreNames.contains('artists')) {
				const store = createStore(db, 'artists')
				createIndexes(store, ['name', 'uuid'], { unique: true })
			}

			if (!objectStoreNames.contains('playlists')) {
				const store = createStore(db, 'playlists')
				createIndexes(store, ['uuid'], { unique: true })
				createIndexes(store, ['name', 'createdAt'])
			}

			if (!objectStoreNames.contains('playlistEntries')) {
				const store = db.createObjectStore('playlistEntries', {
					keyPath: 'id',
					autoIncrement: true,
				})

				createIndexes(store, ['playlistId', 'trackId', 'addedAt'])

				store.createIndex('playlistTrack', ['playlistId', 'trackId'])
			}

			if (!objectStoreNames.contains('directories')) {
				createStore(db, 'directories')
			}

			if (!objectStoreNames.contains('playHistory')) {
				const store = createStore(db, 'playHistory')
				createIndexes(store, ['trackId', 'playedAt'], { unique: true })
			}
		},
	})

type AppIDBDatabase = IDBPDatabase<AppDB>
let dbPromise: Promise<AppIDBDatabase> | AppIDBDatabase | null = null

export const getDatabase = (): Promise<AppIDBDatabase> | AppIDBDatabase => {
	if (dbPromise !== null) {
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
