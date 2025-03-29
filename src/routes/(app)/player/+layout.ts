import { type AppViewTransitionType, defineViewTransitionMatcher } from '$lib/view-transitions.ts'
import { innerHeight, innerWidth } from 'svelte/reactivity/window'
import type { LayoutLoad } from './$types.ts'

export const load: LayoutLoad = () => {
	const sizes = () => {
		const isCompactVertical = (innerHeight.current ?? 0) < 600
		const isCompactHorizontal = (innerWidth.current ?? 0) < 768
		const isCompact = isCompactVertical || isCompactHorizontal

		return {
			isCompactVertical,
			isCompactHorizontal,
			isCompact,
		}
	}

	const layoutMode = (isCompact: boolean, pathname: string) => {
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
		let backNavigation = false
		if (prevRouteWasPlayer && !viewBetweenPlayerAndQueue) {
			view = 'player'
			backNavigation = true
		}

		if (nextRouteIsPlayer && !viewBetweenPlayerAndQueue) {
			view = 'player'
		}

		if (view) {
			return { view, backNavigation }
		}

		return null
	})

	return {
		noPlayerOverlay: true,
		sizes,
		layoutMode,
	}
}
