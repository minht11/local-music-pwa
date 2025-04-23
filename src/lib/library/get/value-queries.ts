import { createQuery, type QueryResult } from '$lib/db/query/query.ts'
import { unwrap } from '$lib/helpers/utils/unwrap.ts'
import type { LibraryItemStoreName } from '../types.ts'
import {
	type GetLibraryItemValueResult,
	getLibraryItemValue,
	shouldRefetchLibraryItemValue,
} from './value.ts'

export type { AlbumData, ArtistData, PlaylistData, TrackData } from './value.ts'

export interface LibraryItemQueryOptions<AllowEmpty extends boolean = false> {
	allowEmpty?: AllowEmpty
}

const defineQuery =
	<Store extends LibraryItemStoreName>(storeName: Store) =>
	<AllowEmpty extends boolean = false>(
		idGetter: number | (() => number),
		options: LibraryItemQueryOptions<AllowEmpty> = {},
	): QueryResult<GetLibraryItemValueResult<Store, AllowEmpty>> => {
		return createQuery({
			key: idGetter,
			fetcher: (id) => getLibraryItemValue(storeName, id, options.allowEmpty),
			onDatabaseChange: (changes, { refetch }) => {
				if (shouldRefetchLibraryItemValue(storeName, unwrap(idGetter), changes)) {
					void refetch()
				}
			},
		})
	}

type LibraryItemQuery<Store extends LibraryItemStoreName> = ReturnType<typeof defineQuery<Store>>

export const createTrackQuery: LibraryItemQuery<'tracks'> = /* @__PURE__ */ defineQuery('tracks')
export const createAlbumQuery: LibraryItemQuery<'albums'> = /* @__PURE__ */ defineQuery('albums')
export const createArtistQuery: LibraryItemQuery<'artists'> = /* @__PURE__ */ defineQuery('artists')
export const createPlaylistQuery: LibraryItemQuery<'playlists'> =
	/* @__PURE__ */ defineQuery('playlists')
