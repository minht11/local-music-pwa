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
 *
 * Each engine instance is responsible for exactly one track.
 * The coordinator owns two instances (current + next) and manages
 * transitions between them.
 */
export interface AudioEngineImpl {
	readonly currentTime: number

	readonly duration: number

	play: () => Promise<void>
	pause: () => void

	/**
	 * Seek to a position within the current track.
	 * Aborts any pre-scheduled buffers and re-schedules from the new time.
	 */
	seek: (time: number) => void
	setPlaybackRate: (rate: number, preservePitch: boolean) => void

	/**
	 * True while waiting for enough decoded audio to start/resume playback.
	 * Always false for HTML engine.
	 */
	readonly buffering: boolean

	/** Fires when the track finishes playing naturally. */
	onEnded: (() => void) | null

	/** Fires on an unrecoverable playback error. */
	onError: (() => void) | null
}
