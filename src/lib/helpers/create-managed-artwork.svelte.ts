import { dbGetImageRecord } from '$lib/library/images'
import type { Album, Track } from '$lib/library/types.ts'
import { getOrInsertAsync } from './get-or-insert-async.ts'

class Artwork {
	cacheKey: string

	url: string

	#refCount = 0

	constructor(cacheKey: string, blob: Blob) {
		this.cacheKey = cacheKey
		this.url = URL.createObjectURL(blob)
	}

	acquire() {
		this.#refCount += 1
	}

	release() {
		this.#refCount -= 1
		if (this.#refCount === 0) {
			scheduleCleanup(this)
		}
	}

	disposeIfUnused() {
		if (this.#refCount > 0) {
			return
		}

		if (cache.get(this.cacheKey) === this) {
			cache.delete(this.cacheKey)
		}
		URL.revokeObjectURL(this.url)
	}
}

const cache = new Map<string, Artwork | Promise<Artwork | undefined>>()

const cleanupQueue = new Set<Artwork>()
let isCleanupScheduled = false
const scheduleCleanup = (artwork: Artwork) => {
	cleanupQueue.add(artwork)

	if (isCleanupScheduled) {
		return
	}

	isCleanupScheduled = true
	const oneMinute = 60 * 1000
	setTimeout(() => {
		for (const queued of cleanupQueue) {
			queued.disposeIfUnused()
		}
		cleanupQueue.clear()
		isCleanupScheduled = false
	}, oneMinute)
}

type ArtworkSourceImageSize = 'full' | 'small'

type ArtworkSource =
	| {
			type: 'blob'
			cacheKey: string
			blob: Blob
	  }
	| {
			// We can't use blob directly because indexedDB returns fresh references to same data.
			type: 'imageHash'
			imageHash: string
			cacheKey: string
			size: ArtworkSourceImageSize
	  }

const fetchArtwork = async (source: ArtworkSource): Promise<Artwork | undefined> => {
	let blob: Blob | undefined
	if (source.type === 'imageHash') {
		const record = await dbGetImageRecord(source.imageHash)
		blob = source.size === 'full' ? record?.full : record?.small
	} else {
		blob = source.blob
	}

	if (!blob) {
		return undefined
	}

	const artwork = new Artwork(source.cacheKey, blob)

	// Every requester may have unmounted before the shared fetch resolved,
	// leaving nobody to release the artwork. The cleanup pass re-checks
	// the ref count, so a claimed artwork survives this.
	scheduleCleanup(artwork)

	return artwork
}

export const createManagedArtwork = (getSource: () => ArtworkSource | null | undefined) => {
	let artworkUrl = $state<string>()

	$effect.pre(() => {
		const source = getSource()
		if (!source) {
			artworkUrl = undefined
			return
		}

		let released = false
		let acquired: Artwork | undefined

		const acquire = (artwork: Artwork | undefined) => {
			if (released) {
				return
			}

			if (artwork) {
				artwork.acquire()
				acquired = artwork
			}

			artworkUrl = artwork?.url
		}

		const result = getOrInsertAsync(cache, source.cacheKey, () => fetchArtwork(source))

		if (result instanceof Promise) {
			void result.then(acquire).catch((error: unknown) => {
				console.error('Failed to load artwork', error)
				acquire(undefined)
			})
		} else {
			acquire(result)
		}

		return () => {
			released = true
			acquired?.release()
		}
	})

	return () => artworkUrl
}

/** @public */
export const getTrackManagedArtworkSource = (
	track: Track | undefined,
	size: ArtworkSourceImageSize,
): ArtworkSource | null => {
	if (!track) {
		return null
	}

	if (track.imageHash) {
		return {
			type: 'imageHash',
			imageHash: track.imageHash,
			cacheKey: `${track.imageHash}-${size}`,
			size,
		}
	}

	if (track.image) {
		return {
			type: 'blob',
			// For legacy images its fine to dedupe per track only
			cacheKey: `track-${track.id}-${size}`,
			blob: size === 'full' ? track.image.full : track.image.small,
		}
	}

	return null
}

/** @public */
export const getAlbumManagedArtworkSource = (album: Album | undefined): ArtworkSource | null => {
	if (!album) {
		return null
	}

	const size = 'full' as const

	if (album.imageHash) {
		return {
			type: 'imageHash',
			imageHash: album.imageHash,
			cacheKey: `${album.imageHash}-${size}`,
			size,
		}
	}

	if (album.image) {
		return {
			type: 'blob',
			// For legacy images its fine to dedupe per album only
			cacheKey: `album-${album.id}-${size}`,
			blob: album.image,
		}
	}

	return null
}
