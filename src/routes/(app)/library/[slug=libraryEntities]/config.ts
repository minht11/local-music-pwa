import type { DbValue } from "$lib/db/database"
import type { LibraryItemSortKey } from "$lib/library/get/keys.ts"
import type { LibraryItemStoreName } from "$lib/library/types"

export type LibrarySearchFn<Value> = (
	value: Value,
	searchTerm: string,
) => boolean

export type SortOption<Store extends LibraryItemStoreName> = {
	name: string
	key: LibraryItemSortKey<Store>
}

export interface LibraryRouteConfig<Slug extends LibraryItemStoreName> {
	slug: Slug
	singularTitle: () => string
	pluralTitle: () => string
	search?: LibrarySearchFn<DbValue<Slug>>
	sortOptions: () => SortOption<Slug>[]
}

const includesTerm = (target: string | undefined | null, term: string) =>
	target?.toLowerCase().includes(term)

const artistsIncludesTerm = (item: { artists: string[] | undefined }, term: string) =>
	item.artists?.some((artist) => includesTerm(artist, term)) ?? false

const nameSortOption = {
	name: 'Name',
	key: 'name',
} as const

const trackConfig: LibraryRouteConfig<'tracks'> = {
	slug: 'tracks',
	singularTitle: m.track,
	pluralTitle: m.tracks,
	search: (value, searchTerm) => {
		if (includesTerm(value.name, searchTerm)) {
			return true
		}

		if (includesTerm(value.album, searchTerm)) {
			return true
		}

		if (artistsIncludesTerm(value, searchTerm)) {
			return true
		}

		return false
	},
	sortOptions: () => [
		nameSortOption,
		{
			name: 'Artist',
			key: 'artists',
		},
		{
			name: 'Album',
			key: 'album',
		},
		{
			name: 'Duration',
			key: 'duration',
		},
		{
			name: 'Year',
			key: 'year',
		},
	],
}

const albumConfig: LibraryRouteConfig<'albums'> = {
	slug: 'albums',
	singularTitle: m.album,
	pluralTitle: m.albums,
	search: (value, searchTerm) => {
		if (includesTerm(value.name, searchTerm)) {
			return true
		}

		if (artistsIncludesTerm(value, searchTerm)) {
			return true
		}

		return false
	},
	sortOptions: () => [nameSortOption],
}

const artistConfig: LibraryRouteConfig<'artists'> = {
	slug: 'artists',
	singularTitle: m.artist,
	pluralTitle: m.artists,
	sortOptions: () => [nameSortOption],
}

const playlistConfig: LibraryRouteConfig<'playlists'> = {
	slug: 'playlists',
	singularTitle: m.playlist,
	pluralTitle: m.playlists,
	sortOptions: () => [nameSortOption],
}

export type LibraryRouteConfigsMap = {
	[Slug in LibraryItemStoreName]: LibraryRouteConfig<Slug>
}

export const configsMap: LibraryRouteConfigsMap = {
	tracks: trackConfig,
	albums: albumConfig,
	artists: artistConfig,
	playlists: playlistConfig,
}
