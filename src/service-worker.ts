/// <reference lib='WebWorker' />
/// <reference types="@sveltejs/kit" />
/// <reference types="../.generated/svelte-kit/ambient.d.ts" />

import { PUBLIC_FALLBACK_PAGE } from '$env/static/public'
import { build, files, prerendered, version } from '$service-worker'

declare const self: ServiceWorkerGlobalScope

const CACHE = `cache-${version}`
const ASSETS = [...build, ...files, ...prerendered, PUBLIC_FALLBACK_PAGE]

self.addEventListener('install', (event) => {
	// Create a new cache and add all files to it
	async function addFilesToCache() {
		const cache = await caches.open(CACHE)
		await cache.addAll(ASSETS)
	}

	event.waitUntil(addFilesToCache())
})

self.addEventListener('activate', (event) => {
	self.clients.claim()

	// Remove previous cached data from disk
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE) {
				await caches.delete(key)
			}
		}
	}

	event.waitUntil(deleteOldCaches())
})

self.addEventListener('fetch', (event) => {
	const { request } = event

	// ignore POST requests etc
	if (request.method !== 'GET') {
		return
	}

	const url = new URL(request.url)

	if (url.origin !== self.location.origin) {
		return
	}

	const isNavigationRequest = request.mode === 'navigate'

	// biome-ignore lint/complexity/useSimplifiedLogicExpression: for clarity
	if (!ASSETS.includes(url.pathname) && !isNavigationRequest) {
		return
	}

	async function respond() {
		const cache = await caches.open(CACHE)

		let response = await cache.match(url.pathname)
		if (response) {
			return response
		}

		try {
			response = await fetch(request)

			// if we're offline, fetch can return a value that is not a Response
			// instead of throwing - and we can't pass this non-Response to respondWith
			if (!(response instanceof Response)) {
				throw new Error('invalid response from fetch')
			}

			return response
		} catch (error) {
			if (isNavigationRequest) {
				const fallbackResponse = await cache.match(PUBLIC_FALLBACK_PAGE)

				if (fallbackResponse) {
					console.info('Serving fallback page')

					return fallbackResponse
				}
			}

			throw error
		}
	}

	event.respondWith(respond())
})

self.addEventListener('message', (event) => {
	if (event.data === 'skip-waiting') {
		self.skipWaiting()
	}
})
