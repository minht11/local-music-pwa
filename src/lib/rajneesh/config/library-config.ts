import type { LibraryRouteConfig } from '$lib/routes/(app)/library/[[slug=libraryEntities]]/config.ts'
import * as m from '$paraglide/messages'

const nameSortOption = {
	name: m.name(),
	key: 'name',
} as const

const includesTerm = (target: string | undefined | null, term: string) =>
	target?.toLowerCase().includes(term)

const artistsIncludesTerm = (item: { artists: string[] | undefined }, term: string) =>
	item.artists?.some((artist) => includesTerm(artist, term)) ?? false


export const homeConfig: LibraryRouteConfig<'home'> = {
	slug: 'home',
	singularTitle: () => 'Home',
	pluralTitle: () => 'Home',
	sortOptions: () => [],
}

export const shortsConfig: LibraryRouteConfig<'shorts'> = {
	slug: 'shorts',
	singularTitle: () => 'Shorts',
	pluralTitle: () => 'Shorts',
	sortOptions: () => [],
}

export const exploreConfig: LibraryRouteConfig<'explore'> = {
	slug: 'explore',
	singularTitle: () => 'Explore',
	pluralTitle: () => 'Explore',
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

export const bookmarksConfig: Omit<LibraryRouteConfig<'home'>, 'slug'> & { slug: 'bookmarks' } = {
	slug: 'bookmarks',
	singularTitle: () => 'Bookmark',
	pluralTitle: () => 'Bookmarks',
	sortOptions: () => [],
}
