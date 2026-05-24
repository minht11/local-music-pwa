/** @public */
export type LoadFailReason = 'permission-denied' | 'not-found' | 'error'

export type LoadResult =
	| { status: 'loaded' }
	| { status: 'aborted' }
	| { status: 'failed'; reason: LoadFailReason }

export const CURRENT_TIME_UPDATE_TIMEOUT_MS = 250

/**
 * Common interface for all playback engines.
 *
 * Each engine instance is responsible for exactly one track.
 * The coordinator owns two instances (current + next) and manages
 * transitions between them.
 */
export interface AudioEngine {
	readonly trackId: number

	readonly loading: boolean
	readonly currentTime: number
	readonly duration: number

	/**
	 * Load and begin scheduling the provided blob.
	 *
	 * @param blob       The audio file as a Blob (from resolveTrackFile).
	 * @param scheduleAt AudioContext time at which playback should begin.
	 *                   Omit to start as soon as possible.
	 */
	load: (blob: Blob, scheduleAt?: number) => Promise<LoadResult>

	play: () => Promise<void>
	pause: () => void

	/**
	 * Seek to a position within the current track.
	 * Aborts any pre-scheduled buffers and re-schedules from the new time.
	 */
	seek: (time: number) => void

	/**
	 * Cancel any in-progress load and stop all scheduled audio.
	 * Does not disconnect from the audio graph (call dispose for that).
	 */
	abort: () => void

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
