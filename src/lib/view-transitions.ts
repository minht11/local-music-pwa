import { onNavigate } from '$app/navigation'
import type { LayoutLoadEvent } from '../routes/$types'
import { getActiveRipplesCount } from './attachments/ripple.ts'
import { wait } from './helpers/utils/wait.ts'

export type AppViewTransitionType = 'regular' | 'player' | 'library'

export type AppViewTransitionTypeMatcherResult = {
	view: AppViewTransitionType
	backwards?: boolean
} | null

export type RouteId = Exclude<LayoutLoadEvent['route']['id'], null>

export type AppViewTransitionTypeMatcher = (
	to: RouteId,
	from: RouteId,
) => AppViewTransitionTypeMatcherResult

const matchers: (AppViewTransitionTypeMatcher | undefined)[] = []

export const defineViewTransitionMatcher = (callback: AppViewTransitionTypeMatcher): void => {
	matchers.unshift(callback)
	matchers.length = 2
}

export const setupAppViewTransitions = (disabled: () => boolean): void => {
	onNavigate(async (nav) => {
		if (disabled()) {
			return
		}

		if (
			// biome-ignore lint/complexity/useSimplifiedLogicExpression: suggested fix is not simpler
			!document.startViewTransition ||
			// Chrome introduced support for View Transition types bit later
			!globalThis.ViewTransitionTypeSet
		) {
			return
		}

		const { promise, resolve } = Promise.withResolvers<void>()

		if (getActiveRipplesCount() > 0) {
			// Allow ripple animations to finish before transitioning
			await wait(175)
		}

		const to = nav.to?.route.id
		const from = nav.from?.route.id

		let customMatch: AppViewTransitionTypeMatcherResult | undefined
		if (to && from) {
			for (const matcher of matchers) {
				const match = matcher?.(to as RouteId, from as RouteId)

				if (match) {
					customMatch = match
					break
				}
			}
		}

		const goingBackwards = nav.delta ? nav.delta < 0 : false
		const isBackwards = customMatch?.backwards ?? goingBackwards
		const view = customMatch?.view ?? 'regular'

		document.startViewTransition({
			update: () => {
				resolve()
				return nav.complete
			},
			types: [view, isBackwards ? 'backwards' : 'forwards'],
		})

		return promise
	})
}
