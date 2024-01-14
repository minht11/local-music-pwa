import type { DBSchema, IDBPDatabase, IDBPObjectStore, IndexNames, StoreNames } from 'idb'
import { openDB } from 'idb'
import type { Album, Artist, Track } from './entities'

interface DirectoryDb {
	name: string
	handle: FileSystemDirectoryHandle
}

export interface AppDB extends DBSchema {
	tracks: {
		key: number
		value: Track
		indexes: {
			id: number
			name: string
			album: string
			year: string
			duration: string
			artists: string[]
		}
	}
	albums: {
		key: number
		value: Album
		indexes: {
			id: number
			name: string
			artists: string[]
			year: string
			tracksIds: number[]
		}
	}
	artists: {
		key: number
		value: Artist
		indexes: {
			id: number
			name: string
		}
	}
	directories: {
		key: number
		value: DirectoryDb
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
	Name extends Extract<AppStoreNames, 'albums' | 'tracks' | 'artists'>,
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

export const getDB = () =>
	openDB<AppDB>('app-storage', 2, {
		upgrade(e) {
			const { objectStoreNames } = e

			if (!objectStoreNames.contains('tracks')) {
				const store = createStore(e, 'tracks')

				createIndexes(store, ['name', 'album', 'year', 'duration'])

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

				store.createIndex('tracksIds', 'tracksIds', {
					unique: false,
					multiEntry: true,
				})
			}

			if (!objectStoreNames.contains('artists')) {
				const store = createStore(e, 'artists')
				createUniqueNameIndex(store)
			}

			if (!objectStoreNames.contains('directories')) {
				createStore(e, 'directories')
			}
		},
	})

export const getAllKeys = async <
	Name extends AppStoreNames,
	Indexes extends IndexNames<AppDB, Name>,
>(
	storeName: Name,
	index: Indexes,
) => {
	const db = await getDB()
	const value = await db.getAllKeysFromIndex(storeName, index)

	return Object.values(value)
}

export const getValue = async <Name extends AppStoreNames>(storeName: Name, id?: number) => {
	if (id === undefined) {
		return undefined
	}

	const db = await getDB()

	return db.get(storeName, id)
}

export const isStoreEmpty = async <Name extends AppStoreNames>(storeName: Name) => {
	const db = await getDB()
	const store = db.transaction(storeName).objectStore(storeName)
	const cursor = await store.openKeyCursor()

	return !cursor
}
