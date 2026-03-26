// Module-level state — survives component remounts during in-app navigation
export let lastShortsIndex = 0
export let lastShortsTotalCount = 0

const INDEX_STORAGE_KEY = 'shorts-last-index'
const COUNT_STORAGE_KEY = 'shorts-last-total-count'

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
}

export function setLastShortsIndex(index: number, totalCount: number) {
	lastShortsIndex = index
	lastShortsTotalCount = Math.max(lastShortsTotalCount, totalCount)

	if (typeof window !== 'undefined') {
		window.localStorage.setItem(INDEX_STORAGE_KEY, String(lastShortsIndex))
		window.localStorage.setItem(COUNT_STORAGE_KEY, String(lastShortsTotalCount))
	}
}

