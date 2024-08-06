import { type AppDB, getDB } from '$lib/db/get-db'
import type { IDBPIndex, IndexNames } from 'idb'

export type SortOrder = 'asc' | 'desc'
export type LibraryEntityStoreName = 'tracks' | 'albums' | 'artists' | 'playlists'
export type LibraryEntitySortKey<StoreName extends LibraryEntityStoreName> = Exclude<
	IndexNames<AppDB, StoreName>,
	symbol
>

export interface SortOptions<StoreName extends LibraryEntityStoreName> {
	sort: LibraryEntitySortKey<StoreName>
	order?: SortOrder
	searchTerm?: string
	searchFn?: (value: AppDB[StoreName]['value'], term: string) => boolean
}

type GetEntityIdsIndex<StoreName extends LibraryEntityStoreName> = IDBPIndex<
	AppDB,
	[StoreName],
	StoreName,
	keyof AppDB[StoreName]['indexes']
>

const getEntityIdsWithSearchSlow = async <const StoreName extends LibraryEntityStoreName>(
	storeIndex: GetEntityIdsIndex<StoreName>,
	searchTerm: string,
	searchFn: (value: AppDB[StoreName]['value'], term: string) => boolean,
) => {
	const data: number[] = []

	for await (const cursor of storeIndex.iterate()) {
		if (searchFn(cursor.value, searchTerm)) {
			data.push(cursor.primaryKey)
		}
	}

	return data
}

export const getEntityIds = async <StoreName extends LibraryEntityStoreName>(
	store: StoreName,
	options: SortOptions<StoreName>,
): Promise<number[]> => {
	const db = await getDB()
	const storeIndex = db.transaction(store).store.index(options.sort)

	const { searchTerm, searchFn } = options

	let data: number[]
	if (searchTerm && searchFn) {
		data = await getEntityIdsWithSearchSlow(storeIndex, searchTerm, searchFn)
	} else {
		// Fast path
		data = await db.getAllKeysFromIndex(store, options.sort)
	}

	if (options.order === 'desc') {
		data.reverse()
	}

	return data
}
