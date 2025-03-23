import type { DBSchema, IDBPDatabase, IDBPObjectStore, IndexNames, StoreNames } from 'idb'
import { openDB } from 'idb'
import type { Album, Artist, Directory, Playlist, Track } from './database-types.ts'

export interface AppDB extends DBSchema {
	tracks: {
		key: number
		value: Track
		indexes: Pick<
			Track,
			| 'id'
			| 'name'
			| 'album'
			| 'year'
			| 'duration'
			| 'artists'
			| 'directory'
			| 'fileName'
			| 'lastScanned'
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
		indexes: Pick<Album, 'id' | 'name' | 'artists' | 'year'>
		meta: {
			notAllowedOperations: undefined
		}
	}
	artists: {
		key: number
		value: Artist
		indexes: Pick<Artist, 'id' | 'name'>
		meta: {
			notAllowedOperations: undefined
		}
	}
	playlists: {
		key: number
		value: Playlist
		indexes: Pick<Playlist, 'id' | 'name' | 'created'>
		meta: {
			notAllowedOperations: undefined
		}
	}
	playlistsTracks: {
		key: [playlistId: number, trackId: number]
		value: {
			playlistId: number
			trackId: number
		}
		indexes: {
			playlistId: number
			trackId: number
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

const createIndexes = <DBTypes extends DBSchema | unknown, Name extends StoreNames<DBTypes>>(
	store: IDBPObjectStore<DBTypes, ArrayLike<StoreNames<DBTypes>>, Name, 'versionchange'>,
	indexes: readonly IndexNames<DBTypes, Name>[],
) => {
	for (const name of indexes) {
		store.createIndex(name, name, { unique: false })
	}
}

const createUniqueNameIndex = <
	Name extends Extract<AppStoreNames, 'albums' | 'tracks' | 'artists' | 'playlists'>,
>(
	store: IDBPObjectStore<AppDB, ArrayLike<AppStoreNames>, Name, 'versionchange'>,
) => {
	store.createIndex('name', 'name', { unique: true })
}

const createStore = <DBTypes extends DBSchema | unknown, Name extends StoreNames<DBTypes>>(
	db: IDBPDatabase<DBTypes>,
	storeName: Name,
) =>
	db.createObjectStore(storeName, {
		keyPath: 'id',
		autoIncrement: true,
	})

export const getDB = (): Promise<IDBPDatabase<AppDB>> =>
	// TODO. Reset database version
	openDB<AppDB>('app-storage', 1, {
		upgrade(e) {
			const { objectStoreNames } = e

			if (!objectStoreNames.contains('tracks')) {
				const store = createStore(e, 'tracks')

				createIndexes(store, [
					'name',
					'album',
					'year',
					'duration',
					'lastScanned',
					'directory',
				])

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

				createUniqueNameIndex(store)
				createIndexes(store, ['year'])

				store.createIndex('artists', 'artists', {
					unique: false,
					multiEntry: true,
				})
			}

			if (!objectStoreNames.contains('artists')) {
				const store = createStore(e, 'artists')
				createUniqueNameIndex(store)
			}

			if (!objectStoreNames.contains('playlists')) {
				const store = createStore(e, 'playlists')
				createUniqueNameIndex(store)
				store.createIndex('created', 'created', { unique: false })
			}

			if (!objectStoreNames.contains('playlistsTracks')) {
				const store = e.createObjectStore('playlistsTracks', {
					keyPath: ['playlistId', 'trackId'],
				})

				store.createIndex('playlistId', 'playlistId', { unique: false })
				store.createIndex('trackId', 'trackId', { unique: false })
			}

			if (!objectStoreNames.contains('directories')) {
				createStore(e, 'directories')
			}
		},
	})

export type DbKey<Name extends AppStoreNames> = AppDB[Name]['key']
export type DbValue<Name extends AppStoreNames> = AppDB[Name]['value']
