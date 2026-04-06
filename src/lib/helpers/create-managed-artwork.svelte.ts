class Artwork {
	static idCounter = 0

	static createRefId() {
		const index = Artwork.idCounter
		Artwork.idCounter += 1

		return index
	}

	image: Blob

	url: string

	refs = new Set<number>()

	constructor(image: Blob) {
		this.image = image
		this.url = URL.createObjectURL(image)
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

export const createManagedArtwork = (getImage: () => Blob | undefined | null) => {
	const refId = Artwork.createRefId()

	const artwork = $derived.by(() => {
		const image = getImage()

		if (!image) {
			return null
		}

		let artworkInstance = cache.get(image)
		if (!artworkInstance) {
			artworkInstance = new Artwork(image)

			cache.set(image, artworkInstance)
		}

		artworkInstance.refs.add(refId)

		return artworkInstance
	})

	$effect(() => {
		// Need to use variable here so cleanup uses
		// previous value instead of the current one
		const savedArtwork = artwork
		if (!savedArtwork) {
			return
		}

		return () => {
			if (savedArtwork.refs.size === 1) {
				scheduleCleanup(savedArtwork)
			}

			if (import.meta.env.DEV && !savedArtwork.refs.has(refId)) {
				console.warn('Trying to release artwork that is not in use', savedArtwork)
			}

			savedArtwork.refs.delete(refId)
		}
	})

	return () => artwork?.url
}
