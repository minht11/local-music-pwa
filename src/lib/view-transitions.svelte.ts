import type { AfterNavigate, OnNavigate } from '@sveltejs/kit'
import { browser } from '$app/environment'
import { onNavigate } from '$app/navigation'
import type { RouteId } from '$app/types'
import { getActiveRipplesCount } from './attachments/ripple.ts'
import { wait } from './helpers/utils/wait.ts'

export type AppViewTransitionType = 'regular' | 'player' | 'library' | 'disabled'

export type AppViewTransitionTypeMatcherResult = {
	view: AppViewTransitionType
	backwards?: boolean
} | null

export type AppViewTransitionTypeMatcher = (
	to: RouteId,
	from: RouteId,
) => AppViewTransitionTypeMatcherResult

const matchers: (AppViewTransitionTypeMatcher | undefined)[] = []

export const defineViewTransitionMatcher = (callback: AppViewTransitionTypeMatcher): void => {
	matchers.unshift(callback)
	// We only care about last and current matcher,
	// matches from previous routes are not relevant.
	matchers.length = 2
}

type ViewTransitionReadyListener = (
	state: 'before-nav' | 'after-nav',
	match: Exclude<AppViewTransitionTypeMatcherResult, null>,
) => void

const listeners = new Set<ViewTransitionReadyListener>()

const notifyListeners: ViewTransitionReadyListener = (state, match) => {
	for (const listener of listeners) {
		listener(state, match)
	}
}

export const onViewTransitionPrepare = (listener: ViewTransitionReadyListener) => {
	$effect.pre(() => {
		listeners.add(listener)

		return () => {
			queueMicrotask(() => {
				listeners.delete(listener)
			})
		}
	})
}

const viewTransitionsUnsupported = !(
	browser &&
	!!document.startViewTransition &&
	globalThis.ViewTransitionTypeSet
)

const resolveView = (nav: OnNavigate | AfterNavigate) => {
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

	return { view, isBackwards }
}

export const setupAppViewTransitions = (disabled: () => boolean): void => {
	onNavigate(async (nav) => {
		if (disabled() || viewTransitionsUnsupported) {
			return
		}

		const { promise, resolve } = Promise.withResolvers<void>()

		if (getActiveRipplesCount() > 0) {
			// Allow ripple animations to finish before transitioning
			await wait(175)
		}

		const { view, isBackwards } = resolveView(nav)

		if (view === 'disabled') {
			return
		}

		document.startViewTransition({
			update: () => {
				notifyListeners('before-nav', {
					view,
					backwards: isBackwards,
				})
				resolve()
				return nav.complete.then(() => {
					notifyListeners('after-nav', {
						view,
						backwards: isBackwards,
					})
				})
			},
			types: [view, isBackwards ? 'backwards' : 'forwards'],
		})

		return promise
	})
}
