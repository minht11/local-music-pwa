import type { AudioGraph } from './audio-graph.svelte.ts'

export const CURRENT_TIME_UPDATE_TIMEOUT_MS = 250

export interface AudioEngineOptions {
	audioGraph: AudioGraph
	trackId: number
	duration: number
	blob: Blob
	signal: AbortSignal
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
export interface AudioEngine {
	readonly trackId: number

	readonly currentTime: number
	readonly duration: number

	/**
	 * Load the track's audio data and schedule it for playback at the specified time.
	 */
	load: (scheduledAt?: number) => Promise<void>

	play: () => Promise<void>
	pause: () => void

	/**
	 * Seek to a position within the current track.
	 * Aborts any pre-scheduled buffers and re-schedules from the new time.
	 */
	seek: (time: number) => void
	setPlaybackRate: (rate: number, preservePitch: boolean) => void

	/**
	 * abort() + disconnect from the audio graph.
	 * Call when the engine will never be used again.
	 */
	dispose: () => void

	/** Fires when the track finishes playing naturally. */
	onEnded: (() => void) | null

	/** Fires on an unrecoverable playback error. */
	onError: (() => void) | null
}
