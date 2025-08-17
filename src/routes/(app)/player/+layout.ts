import { innerHeight, innerWidth } from 'svelte/reactivity/window'
import type { LayoutMode } from '$lib/components/ListDetailsLayout.svelte'
import {
	type AppViewTransitionType,
	defineViewTransitionMatcher,
} from '$lib/view-transitions.svelte.ts'
import type { LayoutLoad } from './$types.ts'

interface LayoutSizes {
	isCompactVertical: boolean
	isCompactHorizontal: boolean
	isCompact: boolean
}

interface LoadResult {
	noPlayerOverlay: boolean
	sizes: () => LayoutSizes
	layoutMode: (isCompact: boolean, pathname: string) => LayoutMode
}

export const load: LayoutLoad = (): LoadResult => {
	const sizes = (): LayoutSizes => {
		const isCompactVertical = (innerHeight.current ?? 0) < 600
		const isCompactHorizontal = (innerWidth.current ?? 0) < 768
		const isCompact = isCompactVertical || isCompactHorizontal

		return {
			isCompactVertical,
			isCompactHorizontal,
			isCompact,
		}
	}

	const layoutMode = (isCompact: boolean, pathname: string): LayoutMode => {
		if (!isCompact) {
			return 'both'
		}

		if (pathname.endsWith('/queue')) {
			return 'details'
		}

		return 'list'
	}

	defineViewTransitionMatcher((to, from) => {
		const prevRouteWasPlayer = from.startsWith('/(app)/player')
		const nextRouteIsPlayer = to.startsWith('/(app)/player')

		const prevRouteWasQueue = from.endsWith('/queue')
		const nextRouteIsQueue = to.endsWith('/queue')

		const viewBetweenPlayerAndQueue =
			(prevRouteWasPlayer && nextRouteIsQueue) || (prevRouteWasQueue && nextRouteIsPlayer)

		let view: AppViewTransitionType | null = null
		let backwards = false
		if (prevRouteWasPlayer && !viewBetweenPlayerAndQueue) {
			view = 'player'
			backwards = true
		}

		if (nextRouteIsPlayer && !viewBetweenPlayerAndQueue) {
			view = 'player'
		}

		if (view) {
			return { view, backwards }
		}

		return null
	})

	return {
		noPlayerOverlay: true,
		sizes,
		layoutMode,
	}
}
