/**
 * Rajneesh module - fork-specific functionality
 *
 * This module contains all Rajneesh-specific code isolated from upstream.
 * Features are controlled via feature flags to maintain upstream compatibility.
 */

// Feature flags
export { RAJNEESH_FLAGS, isRajneeshEnabled, rajneeshLog } from './feature-flags.ts'
export type { RajneeshFlags } from './feature-flags.ts'

// Types
export { isRemoteFile } from './types.ts'
export type { RemoteFile } from './types.ts'

// Cache
export {
	audioCache,
	getCachedBlob,
	isUrlCached,
	storeBlob,
	removeCachedUrl,
	clearCache,
	getCacheStats,
	listCachedUrls,
	getDownloadManager,
	createDownloadManager,
} from './cache/index.ts'
export type { CacheEntry, CacheStats, DownloadProgress, DownloadState } from './cache/index.ts'

// Catalog
export {
	parseCatalogJson,
	CATALOG_DIRECTORY_ID,
} from './catalog/index.ts'
export type {
	NormalizedCatalog,
	CompactCatalogV1,
} from './catalog/index.ts'

// Initialization
export { initializeRajneesh, isRajneeshInitialized, refreshRajneeshCatalog } from './init.ts'

// Stores
export {
	initializeCatalog,
	getCatalog,
	isCatalogLoading,
	getCatalogError,
	isCatalogInitialized,
} from './stores/index.ts'
export {
	getDownloadProgressState,
	initializeDownloadStore,
	downloadTrack,
	cancelDownload,
	getTrackProgress,
	isTrackDownloaded,
	isTrackDownloading,
	getTrackProgressPercent,
	getAllDownloadProgress,
} from './stores/index.ts'
