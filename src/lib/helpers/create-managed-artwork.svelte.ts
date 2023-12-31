class Artwork {
	static index = 0

	// Used for debugging purposes
	index: number

	image: Blob
	url: string

	refs = new Set<symbol>()

	constructor(image: Blob, key: symbol) {
		this.image = image
		this.url = URL.createObjectURL(image)
		this.refs.add(key)

		this.index = Artwork.index
		Artwork.index += 1
	}
}

const cache = new Map<Blob, Artwork>()
const cleanupQueue = new Set<Blob>()

export const createManagedArtwork = (getImage: () => Blob | undefined) => {
	const key = Symbol()

	const getArtworkState = () => {
		const image = getImage()

		if (!image) {
			return undefined
		}

		let artwork = cache.get(image)
		if (artwork) {
			artwork.refs.add(key)
		} else {
			artwork = new Artwork(image, key)

			cache.set(image, artwork)
		}

		return artwork
	}

	const state = $derived(getArtworkState())
	const url = $derived(state?.url ?? '')

	const releaseLock = (state: Artwork) => {
		if (!state) {
			return
		}

		if (state.refs.size === 1) {
			cleanupQueue.add(state.image)
		}

		if (import.meta.env.DEV) {
			if (!state.refs.has(key)) {
				console.warn('Trying to release artwork that is not in use', state)
			}
		}

		state.refs.delete(key)
	}

	$effect(() => {
		if (!state) {
			return
		}

		return () => {
			releaseLock(state)
		}
	})

	const release = () => {
		state && releaseLock(state)
	}

	return [() => url, release] as const
}

if (!import.meta.env.SSR) {
	const thirtySeconds = 30 * 1000
	window.setInterval(() => {
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
	}, thirtySeconds)
}
