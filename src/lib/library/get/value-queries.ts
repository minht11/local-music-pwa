import { createQuery, type QueryResult } from '$lib/db/query/query.ts'
import type { LibraryStoreName } from '../types.ts'
import { type GetLibraryValueResult, getLibraryValue, shouldRefetchLibraryValue } from './value.ts'

export type { AlbumData, ArtistData, PlaylistData, TrackData } from './value.ts'

export interface LibraryValueQueryOptions<AllowEmpty extends boolean = false> {
	allowEmpty?: AllowEmpty
}

export const createLibraryValueQuery = <Store extends Exclude<LibraryStoreName, 'tracks'>>(
	storeName: () => Store,
	idGetter: () => number,
): QueryResult<GetLibraryValueResult<Store, false>> =>
	createQuery({
		key: () => [storeName(), idGetter()] as const,
		fetcher: () => getLibraryValue(storeName(), idGetter()),
		onDatabaseChange: (changes, { refetch }) => {
			if (shouldRefetchLibraryValue(storeName(), idGetter(), changes)) {
				void refetch()
			}
		},
	})

export const createTrackQuery = <AllowEmpty extends boolean = false>(
	idGetter: () => number,
	options: LibraryValueQueryOptions<AllowEmpty> = {},
): QueryResult<GetLibraryValueResult<'tracks', AllowEmpty>> =>
	createQuery({
		key: idGetter,
		fetcher: (id) => getLibraryValue('tracks', id, options.allowEmpty),
		onDatabaseChange: (changes, { refetch }) => {
			if (shouldRefetchLibraryValue('tracks', idGetter(), changes)) {
				void refetch()
			}
		},
	})
