import { createQuery, type QueryResult } from '$lib/db/query/query.ts'
import type { LibraryStoreName } from '../types.ts'
import {
	type GetLibraryValueResult,
	getLibraryValue,
	shouldRefetchLibraryValue,
} from './value.ts'

export type { AlbumData, ArtistData, PlaylistData, TrackData } from './value.ts'

export interface LibraryValueQueryOptions<AllowEmpty extends boolean = false> {
	allowEmpty?: AllowEmpty
}

const defineQuery =
	<Store extends LibraryStoreName>(storeName: Store) =>
	<AllowEmpty extends boolean = false>(
		idGetter: () => number,
		options: LibraryValueQueryOptions<AllowEmpty> = {},
	): QueryResult<GetLibraryValueResult<Store, AllowEmpty>> => {
		return createQuery({
			key: idGetter,
			fetcher: (id) => getLibraryValue(storeName, id, options.allowEmpty),
			onDatabaseChange: (changes, { refetch }) => {
				if (shouldRefetchLibraryValue(storeName, idGetter(), changes)) {
					void refetch()
				}
			},
		})
	}

type LibraryItemQuery<Store extends LibraryStoreName> = ReturnType<typeof defineQuery<Store>>

export const createTrackQuery: LibraryItemQuery<'tracks'> = /* @__PURE__ */ defineQuery('tracks')
export const createAlbumQuery: LibraryItemQuery<'albums'> = /* @__PURE__ */ defineQuery('albums')
export const createArtistQuery: LibraryItemQuery<'artists'> = /* @__PURE__ */ defineQuery('artists')
export const createPlaylistQuery: LibraryItemQuery<'playlists'> =
	/* @__PURE__ */ defineQuery('playlists')
