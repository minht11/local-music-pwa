import type { LayoutMode } from '$lib/components/ListDetailsLayout.svelte'
import {
	getLibraryItemIds,
} from '$lib/library/get/keys.ts'
import { createLibraryItemKeysPageQuery, type PageQueryResult } from '$lib/library/get/keys-queries.ts'
import { createTracksCountPageQuery } from '$lib/library/tracks-queries.ts'
import { FAVORITE_PLAYLIST_ID, type LibraryItemStoreName } from '$lib/library/types.ts'
import { defineViewTransitionMatcher, type RouteId } from '$lib/view-transitions.ts'
import { innerWidth } from 'svelte/reactivity/window'
import type { LayoutLoad } from './$types.ts'
import {
	configsMap,
	type LibraryRouteConfig,
	type LibrarySearchFn,
} from './config.ts'
import { LibraryStore } from './store.svelte.ts'

const defaultSearchFn: LibrarySearchFn<{ name: string }> = (value, searchTerm) =>
	value.name.toLowerCase().includes(searchTerm)

type LoadDataResult<Slug extends LibraryItemStoreName> = {
	[ExactSlug in Slug]: LibraryRouteConfig<ExactSlug> & {
		store: LibraryStore<ExactSlug>
		itemsIdsQuery: PageQueryResult<number[]>
		tracksCountQuery: PageQueryResult<number>
	}
}[Slug]

const loadData = async <Slug extends LibraryItemStoreName>(slug: Slug): Promise<LoadDataResult<Slug>> => {
	const config = configsMap[slug]
	const searchFn = config.search ?? defaultSearchFn
	const store = new LibraryStore(slug)

	const itemsIdsQueryPromise = createLibraryItemKeysPageQuery(slug, {
		key: () => [slug, store.sortByKey, store.order, store.searchTerm],
		fetcher: async ([name, sortKey, order, searchTerm]) => {
			const result = await getLibraryItemIds(name, {
				sort: sortKey,
				order,
				searchTerm,
				searchFn: (value) => searchFn(value, searchTerm),
			})

			if (slug === 'playlists') {
				return [FAVORITE_PLAYLIST_ID, ...result]
			}

			return result
		},
	})

	const [itemsIdsQuery, tracksCountQuery] = await Promise.all([
		await itemsIdsQueryPromise,
		createTracksCountPageQuery(),
	])

	return {
		...config,
		store,
		itemsIdsQuery,
		tracksCountQuery,
	}
}

type LoadResult = LoadDataResult<LibraryItemStoreName> & {
	isWideLayout: () => boolean
	layoutMode: (isWide: boolean, itemId: string | undefined) => LayoutMode
}

export const load: LayoutLoad = async (event): Promise<LoadResult> => {
	const { slug } = event.params
	const data = await loadData(slug)

	const isWideLayout = () => (innerWidth.current ?? 0) > 1154
	// We pass params here so that inside page we can benefit from $derived caching
	const layoutMode = (isWide: boolean, itemUuid: string | undefined): LayoutMode => {
		if (slug === 'tracks') {
			return 'list'
		}

		if (isWide) {
			return 'both'
		}

		if (itemUuid) {
			return 'details'
		}

		return 'list'
	}

	defineViewTransitionMatcher((to, from) => {
		const libraryRoute: RouteId = '/(app)/library/[slug=libraryEntities]'
		const detailsRoute: RouteId = '/(app)/library/[slug=libraryEntities]/[uuid]'

		if (to === libraryRoute && from === libraryRoute) {
			return { view: 'library' }
		}

		const mode = event.untrack(() => layoutMode(isWideLayout(), event.params.uuid))
		if (mode !== 'both') {
			return null
		}

		if (
			(to === detailsRoute && from === libraryRoute) ||
			(to === libraryRoute && from === detailsRoute) ||
			(to === detailsRoute && from === detailsRoute)
		) {
			return { view: 'library' }
		}

		return null
	})

	return {
		...data,
		isWideLayout,
		layoutMode,
	}
}
