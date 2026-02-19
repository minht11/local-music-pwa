import { innerHeight, innerWidth } from 'svelte/reactivity/window'
import type { RouteId } from '$app/types'
import type { LayoutMode } from '$lib/components/ListDetailsLayout.svelte'

const isRouteQueueOrHistory = (routeId: RouteId): boolean =>
	routeId === '/(app)/player/queue' || routeId === '/(app)/player/history'

const getLayoutMode = (isCompact: boolean, routeId: RouteId | null): LayoutMode => {
	if (!isCompact) {
		return 'both'
	}

	if (routeId && isRouteQueueOrHistory(routeId)) {
		return 'details'
	}

	return 'list'
}

export interface LayoutProps {
	isCompactVertical: boolean
	isCompactHorizontal: boolean
	isCompact: boolean
	layoutMode: LayoutMode
}

export const getLayoutProps = (routeId: RouteId | null): LayoutProps => {
	const isCompactVertical = (innerHeight.current ?? 0) < 600
	const isCompactHorizontal = (innerWidth.current ?? 0) < 768
	const isCompact = isCompactVertical || isCompactHorizontal

	return {
		isCompactVertical,
		isCompactHorizontal,
		isCompact,
		layoutMode: getLayoutMode(isCompact, routeId),
	}
}
