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

export const setupAppViewTransitions = () => {
	const handleViewTransition = (
		to: string | null | undefined,
		from: string | null | undefined,
	) => {
		let viewType: AppViewTransitionType = 'regular'
		let backNavigation = false

		if (to && from) {
			for (const matcher of matchers) {
				const matched = matcher?.(to, from)

				if (matched) {
					viewType = matched.view
					backNavigation = matched.backNavigation ?? false

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
		if (!document.startViewTransition) {
			return
		}

		const { promise, resolve } = Promise.withResolvers<void>()

		if (getActiveRipplesCount() > 0) {
			// Allow ripple animations to finish before transitioning
			await wait(175)
		}

		handleViewTransition(nav.to?.route.id, nav.from?.route.id)

		document.startViewTransition(() => {
			resolve()
			return nav.complete
		})

		return promise
	})
}
