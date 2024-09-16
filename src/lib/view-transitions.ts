import { onNavigate } from '$app/navigation'
import { getActiveRipplesCount } from './actions/ripple.ts'
import { wait } from './helpers/utils/wait.ts'

export type AppViewTransitionType = 'regular' | 'player' | 'library'

export type AppViewTransitionTypeMatcherResult = {
	view: AppViewTransitionType
	backNavigation?: boolean
} | null

/** Used to determine which data attributes to add in order to apply correct view transition */
export type AppViewTransitionTypeMatcher = (
	to: string,
	from: string,
) => AppViewTransitionTypeMatcherResult

const matchers: (AppViewTransitionTypeMatcher | undefined)[] = []

export const defineViewTransitionMatcher = (callback: AppViewTransitionTypeMatcher) => {
	matchers.unshift(callback)
	matchers.length = 2
}

export const setupAppViewTransitions = (disabled: () => boolean) => {
	/**
	 * @param to - to view name
	 * @param from - from view name
	 * @param backNavigationFallback - when not explicitly specified this param will determine if view should be animated as going back to.
	 */
	const handleViewTransition = (
		to: string | null | undefined,
		from: string | null | undefined,
		backNavigationFallback: boolean,
	) => {
		let viewType: AppViewTransitionType = 'regular'
		let backNavigation = backNavigationFallback

		if (to && from) {
			for (const matcher of matchers) {
				const matched = matcher?.(to, from)

				if (matched) {
					viewType = matched.view
					backNavigation = matched.backNavigation ?? backNavigationFallback

					break
				}
			}
		}

		const views: AppViewTransitionType[] = ['regular', 'player', 'library']
		for (const view of views) {
			document.documentElement.toggleAttribute(`data-view-${view}`, view === viewType)
		}

		document.documentElement.toggleAttribute('data-view-back-navigation', backNavigation)
	}

	onNavigate(async (nav) => {
		if (disabled()) {
			return
		}

		if (!document.startViewTransition) {
			return
		}

		const { promise, resolve } = Promise.withResolvers<void>()

		if (getActiveRipplesCount() > 0) {
			// Allow ripple animations to finish before transitioning
			await wait(175)
		}

		const backNavigation = nav.delta ? nav.delta < 0 : false
		handleViewTransition(nav.to?.route.id, nav.from?.route.id, backNavigation)

		document.startViewTransition(() => {
			resolve()
			return nav.complete
		})

		return promise
	})
}
