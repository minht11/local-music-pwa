import { definePageListLoader } from '$lib/db/queries.svelte.ts'
import { getEntityIds } from '$lib/library/general.ts'
import { useTracksCountLoader } from '$lib/loaders/tracks.ts'
import { windowStore } from '$lib/stores/window-store.svelte.ts'
import { defineViewTransitionMatcher } from '$lib/view-transitions.ts'
import type { LayoutLoad } from './$types.ts'
import { LibraryStore } from './store.svelte'

type LibraryStoreNames = 'tracks' | 'albums' | 'artists' | 'playlists'

const nameSortOption = {
	name: 'Name',
	key: 'name',
} as const

const storeMap = {
	tracks: () =>
		new LibraryStore({
			storeName: 'tracks',
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
		}),
	albums: () =>
		new LibraryStore({
			storeName: 'albums',
			singularTitle: m.album(),
			pluralTitle: m.albums(),
			sortOptions: [nameSortOption],
		}),
	artists: () =>
		new LibraryStore({
			storeName: 'artists',
			singularTitle: m.artist(),
			pluralTitle: m.artists(),
			sortOptions: [nameSortOption],
		}),
	playlists: () =>
		new LibraryStore({
			storeName: 'playlists',
			singularTitle: m.playlist(),
			pluralTitle: m.playlists(),
			sortOptions: [nameSortOption],
		}),
} satisfies {
	[K in LibraryStoreNames]: () => LibraryStore<K>
}

export const load: LayoutLoad = async (event) => {
	const { slug } = event.params

	const store = storeMap[slug]()

	// TODO. Parallelize.
	const tracksCountQuery = await useTracksCountLoader()

	const query = await definePageListLoader(store.storeName, {
		key: () => [
			store.storeName,
			store.sortByKey,
			store.order,
			store.searchTerm.toLowerCase().trim(),
		],
		fetcher: ([name, sortKey, order, searchTerm]) =>
			getEntityIds(name, {
				sort: sortKey,
				order,
				searchTerm,
				searchFn: (value) => value.name.toLowerCase().includes(searchTerm),
			}),
	})

	const isWideLayout = () => windowStore.windowWidth > 1154
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
		const libraryRoute = '/library/[slug=libraryEntities]'
		const detailsRoute = '/library/[slug=libraryEntities]/[id]'

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
		tracksCountQuery,
		slug,
		query,
		store,
		title: 'Library',
		isWideLayout,
		layoutMode,
	}
}
