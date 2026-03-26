/**
 * Rajneesh module initialization
 * Call this during app startup to load the catalog
 */

import { rajneeshLog, isRajneeshEnabled } from './feature-flags.ts'
import { initializeCatalog } from './stores/catalog.svelte.ts'
import type { CompactCatalogV1 } from './catalog/schema-json.ts'

let initialized = false
const catalogPath = '/rajneesh/catalog.json'

const fetchCatalog = async (): Promise<CompactCatalogV1> => {
	rajneeshLog(`Fetching catalog from ${catalogPath}...`)
	const response = await fetch(catalogPath, { cache: 'no-cache' })

	if (!response.ok) {
		throw new Error(`Failed to fetch catalog: ${response.status} ${response.statusText}`)
	}

	return response.json() as Promise<CompactCatalogV1>
}

const clearCatalogFromAllCaches = async (): Promise<void> => {
	if (!('caches' in window)) {
		return
	}

	const cacheNames = await caches.keys()
	await Promise.all(
		cacheNames.map(async (cacheName) => {
			const cache = await caches.open(cacheName)
			await cache.delete(catalogPath)
		}),
	)
}

/**
 * Initialize all Rajneesh features.
 * Should be called once during app startup.
 */
export const initializeRajneesh = async (): Promise<void> => {
	if (initialized) {
		rajneeshLog('Rajneesh already initialized')
		return
	}

	if (!isRajneeshEnabled()) {
		rajneeshLog('Rajneesh features disabled')
		return
	}

	rajneeshLog('Initializing Rajneesh features...')

	try {
		const json = await fetchCatalog()

		// Initialize the catalog
		await initializeCatalog(json)
		initialized = true
		rajneeshLog('Rajneesh initialization complete')
	} catch (error) {
		rajneeshLog('Rajneesh initialization failed:', error)
		// We don't throw here to avoid crashing the whole app init, 
		// but the catalog won't be available.
		console.error(error)
	}
}

/**
 * Check if Rajneesh has been initialized
 */
export const isRajneeshInitialized = (): boolean => initialized

/**
 * Force refresh catalog from network and update in-memory state.
 * Clears stale service-worker cache entry first when available.
 */
export const refreshRajneeshCatalog = async (): Promise<boolean> => {
	if (!isRajneeshEnabled()) {
		return false
	}

	await clearCatalogFromAllCaches()
	const json = await fetchCatalog()
	await initializeCatalog(json)
	initialized = true

	return true
}
