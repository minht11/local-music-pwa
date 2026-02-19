import { getDatabase } from '$lib/db/database.ts'
import { createPageQuery, type PageQueryResult } from '$lib/db/query/page-query.svelte.ts'
import { defineViewTransitionMatcher } from '$lib/view-transitions.svelte.ts'
import type { LayoutLoad } from './$types.ts'
import { getLayoutProps } from './layout-props.ts'

interface LoadResult {
	historyTrackIds: PageQueryResult<number[]>
	noPlayerOverlay: boolean
	htmlOverflow: 'auto'
}

const createPlayHistoryQuery = () =>
	createPageQuery({
		key: [],
		fetcher: async () => {
			const db = await getDatabase()
			const entries = await db.getAllFromIndex('playHistory', 'playedAt')

			return entries.map((entry) => entry.trackId)
		},
		onDatabaseChange: (changes, actions) => {
			for (const change of changes) {
				if (change.storeName === 'playHistory') {
					void actions.refetch()
					return
				}
			}
		},
	})

export const load: LayoutLoad = async (): Promise<LoadResult> => {
	defineViewTransitionMatcher((to, from) => {
		const playerRouteId = '/(app)/player'
		const prevRouteWasPlayer = from.startsWith(playerRouteId)
		const nextRouteIsPlayer = to.startsWith(playerRouteId)

		if (prevRouteWasPlayer && nextRouteIsPlayer) {
			const { layoutMode } = getLayoutProps(to)

			if (layoutMode === 'both' || (layoutMode === 'details' && from !== playerRouteId)) {
				return { view: 'disabled' }
			}

			// Use default transition
			return null
		}

		if (prevRouteWasPlayer) {
			return { view: 'player', backwards: true }
		}

		if (nextRouteIsPlayer) {
			return { view: 'player' }
		}

		return null
	})

	const historyTrackIds = await createPlayHistoryQuery()

	return {
		historyTrackIds,
		noPlayerOverlay: true,
		htmlOverflow: 'auto',
	}
}
