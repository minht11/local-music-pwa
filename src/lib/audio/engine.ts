import type { AudioGraph } from './audio-graph.svelte.ts'

export const CURRENT_TIME_UPDATE_TIMEOUT_MS = 250

export interface AudioEngineOptions {
	audioGraph: AudioGraph
	blob: Blob
	signal: AbortSignal
	scheduleAt?: number
	duration: number
	playbackRate: number
	preservePitch: boolean
}

/**
 * Common interface for all playback engines.
 * Each engine instance is responsible for exactly one track.
 */
export interface AudioEngineImpl {
	readonly currentTime: number

	readonly duration: number

	readonly buffering: boolean

	readonly ended: boolean

	play: () => Promise<void>
	pause: () => void

	/**
	 * Seek to a position within the current track.
	 * Aborts any pre-scheduled buffers and re-schedules from the new time.
	 */
	seek: (time: number) => void
	setPlaybackRate: (rate: number, preservePitch: boolean) => void

	onEnded: (() => void) | null

	/** Fires on an unrecoverable playback error. */
	onError: (() => void) | null
}
