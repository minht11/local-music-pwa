// Module-level state — survives component remounts during in-app navigation
export let lastShortsIndex = 0
export let lastShortsTotalCount = 0
export let savedPlaybackTime: number | null = null

const INDEX_STORAGE_KEY = 'shorts-last-index'
const COUNT_STORAGE_KEY = 'shorts-last-total-count'
const PLAYBACK_STORAGE_KEY = 'shorts-last-playback'

if (typeof window !== 'undefined') {
	const storedIndex = window.localStorage.getItem(INDEX_STORAGE_KEY)
	if (storedIndex !== null) {
		const parsed = Number(storedIndex)
		if (Number.isFinite(parsed) && parsed >= 0) {
			lastShortsIndex = parsed
		}
	}

	const storedCount = window.localStorage.getItem(COUNT_STORAGE_KEY)
	if (storedCount !== null) {
		const parsed = Number(storedCount)
		if (Number.isFinite(parsed) && parsed >= 0) {
			lastShortsTotalCount = parsed
		}
	}

	const storedPlayback = window.localStorage.getItem(PLAYBACK_STORAGE_KEY)
	if (storedPlayback !== null) {
		const parsed = Number(storedPlayback)
		if (Number.isFinite(parsed) && parsed >= 0) {
			savedPlaybackTime = parsed
		}
	}
}

export function setLastShortsIndex(index: number, totalCount: number) {
	lastShortsIndex = index
	lastShortsTotalCount = Math.max(lastShortsTotalCount, totalCount)

	if (typeof window !== 'undefined') {
		window.localStorage.setItem(INDEX_STORAGE_KEY, String(lastShortsIndex))
		window.localStorage.setItem(COUNT_STORAGE_KEY, String(lastShortsTotalCount))
	}
}

export function setSavedPlaybackTime(time: number | null) {
	savedPlaybackTime = time
	if (typeof window === 'undefined') return

	if (time === null) {
		window.localStorage.removeItem(PLAYBACK_STORAGE_KEY)
	} else {
		window.localStorage.setItem(PLAYBACK_STORAGE_KEY, String(time))
	}
}

