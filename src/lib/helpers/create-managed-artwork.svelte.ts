class Artwork {
	static index = 0

	// Used for debugging purposes
	index = -1

	image: Blob

	url: string

	refs = new Set<symbol>()

	constructor(image: Blob, key: symbol) {
		this.image = image
		this.url = URL.createObjectURL(image)
		this.refs.add(key)

		if (import.meta.env.DEV) {
			this.index = Artwork.index
			Artwork.index += 1
		}
	}
}

const cache = new WeakMap<Blob, Artwork>()
const cleanupQueue = new Set<Blob>()
let isCleanupScheduled = false
const scheduleCleanup = (artwork: Artwork) => {
	cleanupQueue.add(artwork.image)

	if (isCleanupScheduled) {
		return
	}

	isCleanupScheduled = true
	const thirtySeconds = 30 * 1000
	setTimeout(() => {
		for (const blob of cleanupQueue) {
			const cached = cache.get(blob)
			if (!cached) {
				continue
			}
			if (cached.refs.size === 0) {
				cache.delete(blob)
				URL.revokeObjectURL(cached.url)
			}
		}
		cleanupQueue.clear()
		isCleanupScheduled = false
	}, thirtySeconds)
}

// TODO. build fails with `$effect()` can only be used as an expression statement
// error. After few rolldown updates check if this is still needed
const useManagedTrackCleanup = (key: symbol, artwork: () => Artwork | null) => {
	$effect(() => {
		// Need to use variable here so cleanup uses
		// previous value instead of the current one
		const savedArtwork = artwork()
		if (!savedArtwork) {
			return
		}

		return () => {
			if (savedArtwork.refs.size === 1) {
				scheduleCleanup(savedArtwork)
			}

			if (import.meta.env.DEV) {
				if (!savedArtwork.refs.has(key)) {
					console.warn('Trying to release artwork that is not in use', savedArtwork)
				}
			}

			savedArtwork.refs.delete(key)
		}
	})
}

export const createManagedArtwork = (getImage: () => Blob | undefined | null) => {
	const key = Symbol()

	const artwork = $derived.by(() => {
		const image = getImage()

		if (!image) {
			return null
		}

		let artwork = cache.get(image)
		if (artwork) {
			artwork.refs.add(key)
		} else {
			artwork = new Artwork(image, key)

			cache.set(image, artwork)
		}

		return artwork
	})

	useManagedTrackCleanup(key, () => artwork)

	return () => artwork?.url
}
