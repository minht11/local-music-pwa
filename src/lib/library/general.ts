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

	if (order === 'desc') {
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
