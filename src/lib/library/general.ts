import { type AppDB, getDB } from '$lib/db/get-db'
import type { IndexNames } from 'idb'

export type SortOrder = 'asc' | 'desc'
export type LibraryEntityStoreName = 'tracks' | 'albums' | 'artists'
export type LibraryEntitySortKey<StoreName extends LibraryEntityStoreName> = IndexNames<
	AppDB,
	StoreName
>

export const getEntityIds = async <StoreName extends LibraryEntityStoreName>(
	store: StoreName,
	sortBy: LibraryEntitySortKey<StoreName>,
	order: SortOrder = 'asc',
) => {
	const db = await getDB()
	// Compared to all other methods this
	// is the fastest way to get data from DB,
	// array reversing is also incredibly fast.
	const data = await db.getAllKeysFromIndex(store, sortBy)

	if (order === 'asc') {
		data.reverse()
	}

	return data
}
