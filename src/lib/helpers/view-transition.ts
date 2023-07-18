import { writable } from 'svelte/store'

declare global {
	interface Document {
		startViewTransition: (updateDOM: () => void | Promise<void>) => {
			ready: Promise<void>
			updateCallbackDone: Promise<void>
			finished: Promise<void>
		}
	}
}

export interface ViewTransitionOptions {
	skipTransition?: boolean
	classNames?: string[]
	updateDOM: () => void | Promise<void>
}

export const startViewTransitionHelper = (options: ViewTransitionOptions) => {
	const { skipTransition = false, classNames = [], updateDOM } = options

	if (skipTransition || !document.startViewTransition) {
		const updateCallbackDone = Promise.resolve(updateDOM()).then(() => undefined)

		return {
			ready: Promise.reject(Error('View transitions unsupported')),
			updateCallbackDone,
			finished: updateCallbackDone,
		}
	}

	document.documentElement.classList.add(...classNames)

	const transition = document.startViewTransition(updateDOM)

	transition.finished.finally(() => document.documentElement.classList.remove(...classNames))

	return transition
}

export const useViewTransition = () => {
	const isDomUpdated = writable(false)

	const start = (options: Omit<ViewTransitionOptions, 'updateDOM'> = {}) => {
		isDomUpdated.set(false)
		let unsubscribe: () => void
		const transition = startViewTransitionHelper({
			...options,
			updateDOM: () =>
				new Promise((resolve) => {
					unsubscribe = isDomUpdated.subscribe((value) => {
						console.log('subscribed', value)
						if (value) {
							resolve()
						}
					})
				}),
		})

		transition.updateCallbackDone.then(() => {
			unsubscribe()
		})
	}

	const markDomUpdated = () => {
		isDomUpdated.set(true)
	}

	return {
		start,
		markDomUpdated,
	}
}
