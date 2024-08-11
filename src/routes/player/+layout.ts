import { windowStore } from '$lib/stores/window-store.svelte.ts'
import { type AppViewTransitionType, defineViewTransitionMatcher } from '$lib/view-transitions.ts'
import type { LayoutLoad } from './$types.ts'

export const load: LayoutLoad = () => {
	const sizes = () => {
		const isCompactVertical = windowStore.windowHeight < 600
		const isCompactHorizontal = windowStore.windowWidth < 768
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
		const previousRouteWasPlayer = from?.startsWith('/player')
		const currentRouteIsPlayer = to?.startsWith('/player')

		const prevRouteWasQueue = from?.endsWith('/queue')
		const nextRouteIsQueue = to?.endsWith('/queue')

		const viewBetweenPlayerAndQueue =
			(previousRouteWasPlayer && nextRouteIsQueue) ||
			(prevRouteWasQueue && currentRouteIsPlayer)

		let view: AppViewTransitionType | null = null
		let backNavigation = false
		if (previousRouteWasPlayer && !viewBetweenPlayerAndQueue) {
			view = 'player'
			backNavigation = true
		}

		if (currentRouteIsPlayer && !viewBetweenPlayerAndQueue) {
			view = 'player'
		}

		if (view) {
			return { view, backNavigation }
		}

		return null
	})

	return {
		title: 'Player',
		noPlayerOverlay: true,
		sizes,
		layoutMode,
	}
}
