import { createTracksCountPageQuery } from '$lib/queries/tracks.ts'
import { defineViewTransitionMatcher, type RouteId } from '$lib/view-transitions.ts'
import { innerWidth } from 'svelte/reactivity/window'
import type { LayoutLoad } from './$types.ts'
import { defineLibraryPageData } from './store.svelte'

const nameSortOption = {
	name: 'Name',
	key: 'name',
} as const

const includesTerm = (target: string | undefined | null, term: string) =>
	target?.toLowerCase().includes(term)

const artistsIncludesTerms = (artists: string[] | undefined, term: string) =>
	artists?.some((artist) => includesTerm(artist, term)) ?? false

const storeMap = {
	tracks: defineLibraryPageData(
		'tracks',
		{
			singularTitle: m.track(),
			pluralTitle: m.tracks(),
			sortOptions: [
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
		},
		(value, searchTerm) =>
			includesTerm(value.name, searchTerm) ||
			includesTerm(value.album, searchTerm) ||
			artistsIncludesTerms(value.artists, searchTerm),
	),
	albums: defineLibraryPageData(
		'albums',
		{
			singularTitle: m.album(),
			pluralTitle: m.albums(),
			sortOptions: [nameSortOption],
		},
		(value, searchTerm) =>
			includesTerm(value.name, searchTerm) || artistsIncludesTerms(value.artists, searchTerm),
	),
	artists: defineLibraryPageData('artists', {
		singularTitle: m.artist(),
		pluralTitle: m.artists(),
		sortOptions: [nameSortOption],
	}),
	playlists: defineLibraryPageData('playlists', {
		singularTitle: m.playlist(),
		pluralTitle: m.playlists(),
		sortOptions: [nameSortOption],
	}),
} as const

export const load: LayoutLoad = async (event) => {
	const { slug } = event.params

	const [data, tracksCountQuery] = await Promise.all([
		storeMap[slug](),
		createTracksCountPageQuery(),
	])

	const isWideLayout = () => (innerWidth.current ?? 0) > 1154
	// We pass params here so that inside page we can benefit from $derived caching
	const layoutMode = (isWide: boolean, itemId: string | undefined) => {
		if (slug === 'tracks') {
			return 'list'
		}

		if (isWide) {
			return 'both'
		}

		if (itemId) {
			return 'details'
		}

		return 'list'
	}

	defineViewTransitionMatcher((to, from) => {
		const libraryRoute: RouteId = '/(app)/library/[slug=libraryEntities]'
		const detailsRoute: RouteId = '/(app)/library/[slug=libraryEntities]/[id]'

		if (to === libraryRoute && from === libraryRoute) {
			return { view: 'library' } as const
		}

		const mode = event.untrack(() => layoutMode(isWideLayout(), event.params.id))
		if (mode !== 'both') {
			return null
		}

		if (
			(to === detailsRoute && from === libraryRoute) ||
			(to === libraryRoute && from === detailsRoute) ||
			(to === detailsRoute && from === detailsRoute)
		) {
			return { view: 'library' } as const
		}

		return null
	})

	return {
		...data,
		tracksCountQuery,
		slug,
		isWideLayout,
		layoutMode,
	}
}
