import type {
	DBSchema,
	IDBPDatabase,
	IDBPObjectStore,
	IndexNames,
	StoreNames,
} from 'idb/with-async-ittr'
import { openDB } from 'idb/with-async-ittr'
import type { Album, Artist, Track } from './entities'

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
}

const createIndexes = <DBTypes extends DBSchema | unknown, Name extends StoreNames<DBTypes>>(
	store: IDBPObjectStore<DBTypes, ArrayLike<StoreNames<DBTypes>>, Name, 'versionchange'>,
	indexes: readonly IndexNames<DBTypes, Name>[],
) => {
	indexes.forEach((name) => {
		store.createIndex(name, name, { unique: false })
	})
}

const createUniqueNameIndex = <Name extends StoreNames<AppDB>>(
	store: IDBPObjectStore<AppDB, ArrayLike<StoreNames<AppDB>>, Name, 'versionchange'>,
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
	openDB<AppDB>('test-app-storage', 2, {
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
			}

			if (!objectStoreNames.contains('artists')) {
				const store = createStore(e, 'artists')
				createUniqueNameIndex(store)
			}

			// const store = createStore(e, 'artists')
		},
	})

export const getAllKeys = async <
	Name extends StoreNames<AppDB>,
	Indexes extends IndexNames<AppDB, Name>,
>(
	storeName: Name,
	index: Indexes,
) => {
	const db = await getDB()
	// const store = db.transaction(storeName).objectStore(storeName)
	const value = await db.getAllKeysFromIndex(storeName, index)

	return Object.values(value)
}

export const getValue = async <Name extends StoreNames<AppDB>>(storeName: Name, id?: number) => {
	if (id === undefined) {
		return undefined
	}

	const db = await getDB()

	return db.get(storeName, id)
}

export const isStoreEmpty = async <Name extends StoreNames<AppDB>>(storeName: Name) => {
	const db = await getDB()
	const store = db.transaction(storeName).objectStore(storeName)
	const cursor = await store.openKeyCursor()

	return !cursor
}
