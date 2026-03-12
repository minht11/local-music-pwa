import { getCatalog } from '$lib/rajneesh/stores/catalog.svelte.ts'
import { getPersistedHindiOnly } from '$lib/stores/main/store.svelte.ts'
import type { RemoteFile } from '$lib/rajneesh/types.ts'
import type { Track } from '$lib/library/types.ts'

export interface ShortItem {
	url: string
	trackId: string
	startSeconds: number
	albumName: string
	albumUuid: string
	trackIndex: number // 1-based
}

const PAGE_SIZE = 20
const MIN_START = 60 // 1 min
const MAX_START = 40 * 60 // 40 min

const SEED_STORAGE_KEY = 'shorts-seed'

// Deterministic per-user PRNG so shorts order is stable across sessions.
let seededRandom: (() => number) | null = null

function createMulberry32(seed: number): () => number {
	return function mulberry32() {
		let t = (seed += 0x6d2b79f5)
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

function initSeededRandom(): void {
	if (seededRandom) return

	// On the server we don't have window/localStorage, just fall back to Math.random.
	if (typeof window === 'undefined') {
		seededRandom = Math.random
		return
	}

	const existing = window.localStorage.getItem(SEED_STORAGE_KEY)
	let seed: number

	if (existing !== null) {
		const parsed = Number(existing)
		seed = Number.isFinite(parsed) ? parsed : Math.floor(Math.random() * 0xffffffff)
	} else {
		seed = Math.floor(Math.random() * 0xffffffff)
		window.localStorage.setItem(SEED_STORAGE_KEY, String(seed))
	}

	seededRandom = createMulberry32(seed)
}

function getRandom(): number {
	if (!seededRandom) {
		initSeededRandom()
	}
	return seededRandom!()
}

const isEnglishTrack = (url: string): boolean =>
	url.toLowerCase().includes('/english/')

function slugify(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

function getTrackId(track: Track, url: string): string {
	try {
		const parsed = new URL(url, 'https://shorts.local')
		const fileName = parsed.pathname.split('/').pop() ?? ''
		const baseName = fileName.replace(/\.[^.]+$/, '')
		if (baseName) return slugify(baseName)
	} catch {
		// Ignore malformed URL and fallback to track fields
	}

	return slugify(`${track.album ?? 'unknown'}-${track.trackNo}`)
}

function getFilteredTracks(): Track[] {
	const catalog = getCatalog()
	if (!catalog || catalog.tracks.length === 0) return []

	const hindiOnly = getPersistedHindiOnly()
	if (!hindiOnly) return catalog.tracks

	return catalog.tracks.filter((t) => {
		const file = t.file as RemoteFile | undefined
		return file?.url && !isEnglishTrack(file.url)
	})
}

// Module-level growable list — survives component remounts
const items: ShortItem[] = []
let generatedWithHindiOnly: boolean | null = null

function generateBatch(count: number): ShortItem[] {
	const tracks = getFilteredTracks()
	if (tracks.length === 0) return []

	const batch: ShortItem[] = []

	let attempts = 0
	while (batch.length < count && attempts < count * 3) {
		attempts++
		const idx = Math.floor(getRandom() * tracks.length)
		const track = tracks[idx]
		const file = track.file as RemoteFile | undefined
		if (!file || file.type !== 'remote' || !file.url) continue

		const startSeconds = Math.floor(getRandom() * (MAX_START - MIN_START + 1)) + MIN_START

		// Find album info for this track
		const catalog = getCatalog()
		const album = catalog?.albums.find((a) => a.name === track.album)

		batch.push({
			url: file.url,
			trackId: getTrackId(track, file.url),
			startSeconds,
			albumName: track.album ?? 'Unknown',
			albumUuid: album?.uuid ?? '',
			trackIndex: track.trackNo,
		})
	}

	return batch
}

/** Get all currently loaded shorts */
export function getShortsItems(): ShortItem[] {
	const currentHindiOnly = getPersistedHindiOnly()
	// Reset if the language filter changed since last generation
	if (generatedWithHindiOnly !== null && generatedWithHindiOnly !== currentHindiOnly) {
		items.length = 0
	}
	// Seed initial batch if empty
	if (items.length === 0) {
		generatedWithHindiOnly = currentHindiOnly
		items.push(...generateBatch(PAGE_SIZE))
	}
	return items
}

/** Append another page of random shorts. Returns the new total count. */
export function loadMoreShorts(): number {
	items.push(...generateBatch(PAGE_SIZE))
	return items.length
}

export function ensureShortByTrackId(trackId: string, startFrom?: number): number {
	const normalizedTrackId = slugify(trackId)
	if (!normalizedTrackId) return -1

	const requestedStart = Number.isFinite(startFrom) ? Math.max(0, Math.floor(startFrom!)) : undefined

	const existingIndex = items.findIndex((item) =>
		item.trackId === normalizedTrackId
		&& (requestedStart === undefined || item.startSeconds === requestedStart)
	)
	if (existingIndex >= 0) return existingIndex

	const tracks = getFilteredTracks()
	for (const track of tracks) {
		const file = track.file as RemoteFile | undefined
		if (!file?.url || file.type !== 'remote') continue
		if (getTrackId(track, file.url) !== normalizedTrackId) continue

		const catalog = getCatalog()
		const album = catalog?.albums.find((a) => a.name === track.album)
		const short: ShortItem = {
			url: file.url,
			trackId: normalizedTrackId,
			startSeconds: requestedStart ?? (Math.floor(getRandom() * (MAX_START - MIN_START + 1)) + MIN_START),
			albumName: track.album ?? 'Unknown',
			albumUuid: album?.uuid ?? '',
			trackIndex: track.trackNo,
		}
		items.unshift(short)
		return 0
	}

	return -1
}

/** Reset everything (full page reload or setting change) */
export function resetShortsData(): void {
	items.length = 0
	generatedWithHindiOnly = null
}
