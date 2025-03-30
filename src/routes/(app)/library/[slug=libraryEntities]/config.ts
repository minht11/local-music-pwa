import type { DbValue } from "$lib/db/get-db"
import type { LibraryEntitySortKey } from "$lib/library/general"

type LibrarySlug = 'tracks' | 'albums' | 'artists' | 'playlists'

export type LibrarySearchFn<Value> = (
	value: Value,
	searchTerm: string,
) => boolean

export type SortOption<StoreName extends LibrarySlug> = {
	name: string
	key: LibraryEntitySortKey<StoreName>
}

export interface LibraryRouteConfig<Slug extends LibrarySlug> {
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
	[key in LibrarySlug]: LibraryRouteConfig<key>
}

export const configsMap: LibraryRouteConfigsMap = {
	tracks: trackConfig,
	albums: albumConfig,
	artists: artistConfig,
	playlists: playlistConfig,
}
