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

export interface ActiveMinute {
	trackId: string
	trackTimestampMs: number
	activeMinuteTimestampMs: number
	playbackRate: number
}

export interface CompletedTrack {
	id?: number
	trackId: string
	completedAt: number
}

export interface BookmarkRecord {
	id?: number
	trackId: number
	timestampSeconds: number
	note?: string
	createdAt: number
	updatedAt: number
}

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
	home: {
		key: number
		value: { id: number; name: string }
		indexes: { name: string }
	}
	shorts: {
		key: number
		value: { id: number; name: string }
		indexes: { name: string }
	}
	explore: {
		key: number
		value: Album
		indexes: Pick<Album, 'uuid' | 'name' | 'artists' | 'year'>
	}
	activeMinutes: {
		key: number
		value: ActiveMinute
		indexes: {
			trackId: string
			activeMinuteTimestampMs: number
			trackIdActiveMinuteTimestampMs: [trackId: string, activeMinuteTimestampMs: number]
		}
	}
	completedTracks: {
		key: number
		value: CompletedTrack
		indexes: {
			trackId: string
			completedAt: number
		}
	}
	bookmarks: {
		key: number
		value: BookmarkRecord
		indexes: {
			trackId: number
			createdAt: number
			updatedAt: number
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
	openDB<AppDB>('snae-app-data', 7, {
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

			if (!objectStoreNames.contains('shorts')) {
				const store = createStore(db, 'shorts')
				createIndexes(store, ['name'])
			}

			const shouldRecreateActiveMinutes =
				oldVersion < 4 && objectStoreNames.contains('activeMinutes')
			if (shouldRecreateActiveMinutes) {
				db.deleteObjectStore('activeMinutes')
			}

			if (shouldRecreateActiveMinutes || !objectStoreNames.contains('activeMinutes')) {
				const store = db.createObjectStore('activeMinutes', {
					keyPath: 'activeMinuteTimestampMs',
				})
				createIndexes(store, ['trackId', 'activeMinuteTimestampMs'])
				store.createIndex('trackIdActiveMinuteTimestampMs', ['trackId', 'activeMinuteTimestampMs'], {
					unique: false,
				})
			}

			if (!objectStoreNames.contains('completedTracks')) {
				const store = createStore(db, 'completedTracks')
				createIndexes(store, ['trackId'], { unique: true })
				createIndexes(store, ['completedAt'])
			}

			if (!objectStoreNames.contains('bookmarks')) {
				const store = createStore(db, 'bookmarks')
				createIndexes(store, ['trackId', 'createdAt', 'updatedAt'])
			}
		},
	})

type AppIDBDatabase = IDBPDatabase<AppDB>
let dbPromise: Promise<AppIDBDatabase> | AppIDBDatabase | null = null
let schemaResetAttempted = false

const deleteDatabase = (): Promise<void> =>
	new Promise((resolve, reject) => {
		const request = indexedDB.deleteDatabase('snae-app-data')
		request.onsuccess = () => resolve()
		request.onerror = () => reject(request.error)
		request.onblocked = () => resolve()
	})

export const getDatabase = (): Promise<AppIDBDatabase> | AppIDBDatabase => {
	if (dbPromise) {
		return dbPromise
	}

	dbPromise = openAppDatabase().then(async (db) => {
		if (!db.objectStoreNames.contains('activeMinutes') && !schemaResetAttempted) {
			schemaResetAttempted = true
			db.close()
			await deleteDatabase()
			return openAppDatabase()
		}

		return db
	})

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
