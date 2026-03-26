// https://whatwebcando.today/articles/handling-service-worker-updates/

const waitForPageToLoad = () => {
	if (document.readyState === 'loading') {
		return new Promise((resolve) => {
			window.addEventListener('load', resolve, { once: true })
		})
	}

	return
}

/** @public */
export interface RegisterSwOptions {
	onNeedRefresh: (updateSw: () => void) => void
}

const triggerWaitingServiceWorker = (registration: ServiceWorkerRegistration): boolean => {
	const { waiting } = registration
	if (!waiting) {
		return false
	}

	waiting.postMessage('skip-waiting')
	return true
}

const wait = (ms: number): Promise<void> =>
	new Promise((resolve) => {
		window.setTimeout(resolve, ms)
	})

/**
 * Checks if a newer service worker is available and activates it immediately.
 * Returns true when an update was found and activation was triggered.
 */
export const forceServiceWorkerUpdate = async (): Promise<boolean> => {
	if (import.meta.env.DEV || !('serviceWorker' in navigator)) {
		return false
	}

	const registration = await navigator.serviceWorker.getRegistration('/')
	if (!registration) {
		return false
	}

	if (triggerWaitingServiceWorker(registration)) {
		return true
	}

	await registration.update()

	if (triggerWaitingServiceWorker(registration)) {
		return true
	}

	const timeoutMs = 6000
	const startedAt = Date.now()

	while (Date.now() - startedAt < timeoutMs) {
		if (triggerWaitingServiceWorker(registration)) {
			return true
		}
		await wait(200)
	}

	return false
}

/** @public */
export const registerServiceWorker = async (options: RegisterSwOptions) => {
	if (import.meta.env.DEV) {
		return
	}

	await waitForPageToLoad()

	const { serviceWorker } = navigator
	const registration = await serviceWorker.register('/service-worker.js', {
		scope: '/',
	})

	const needsRefresh = (reg: ServiceWorkerRegistration) => {
		const updateSw = () => {
			triggerWaitingServiceWorker(reg)
		}

		options.onNeedRefresh(updateSw)
	}

	// ensure the case when the updatefound event was missed is also handled
	// by re-invoking the prompt when there's a waiting Service Worker
	if (registration.waiting) {
		needsRefresh(registration)
	}

	let firstLoad = false

	registration.addEventListener('updatefound', () => {
		const { installing } = registration
		if (!installing) {
			return
		}

		// wait until the new Service worker is actually installed (ready to take over)
		installing.addEventListener('statechange', () => {
			if (registration.waiting) {
				if (navigator.serviceWorker.controller) {
					// if there's an existing controller (previous Service Worker), show the prompt
					needsRefresh(registration)
				} else {
					firstLoad = true
				}
			}
		})
	})

	let refreshing = false
	// detect controller change and refresh the page
	navigator.serviceWorker.addEventListener('controllerchange', () => {
		if (firstLoad) {
			firstLoad = false
			return
		}

		if (!refreshing) {
			window.location.reload()
			refreshing = true
		}
	})
}
