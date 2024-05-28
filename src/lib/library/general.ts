import { type AppDB, getDB } from '$lib/db/get-db'
import type { IDBPIndex, IndexNames } from 'idb'

export type SortOrder = 'asc' | 'desc'
export type LibraryEntityStoreName = 'tracks' | 'albums' | 'artists'
export type LibraryEntitySortKey<StoreName extends LibraryEntityStoreName> = IndexNames<
	AppDB,
	StoreName
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

export const getEntityIdsWithSearchSlow = async <const StoreName extends LibraryEntityStoreName>(
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
) => {
	const db = await getDB()
	const storeIndex = db.transaction(store).store.index(options.sort)

	// console.log('storeIndex', options.sort, storeIndex, options.order)
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

// export interface UseEntityOptions<AllowEmpty extends boolean = false> {
// 	allowEmpty?: AllowEmpty
// }

// export type UseTrackResult<AllowEmpty extends boolean = false> = AllowEmpty extends true
// 	? Track | undefined
// 	: Track

// export const useEntityData = <AllowEmpty extends boolean = false>(
// 	id: number | (() => number),
// 	options: UseEntityOptions<AllowEmpty> = {},
// ) =>
// 	useDbQuery({
// 		key: () => (typeof id === 'function' ? id() : id),
// 		fetcher: async (key): Promise<UseTrackResult<AllowEmpty>> => {
// 			const track = await getTrack(key)

// 			if (options.allowEmpty) {
// 				return track as Track
// 			}

// 			invariant(track, `Track with id ${key} not found`)

// 			return track
// 		},
// 		cache: tracksCache,
// 		onDatabaseChange: () => {},
// 	})

// export const useValue = <T>(value: T) => {}
