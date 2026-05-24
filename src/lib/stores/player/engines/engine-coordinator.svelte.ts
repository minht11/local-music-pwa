import { canTrackUseGapless } from '$lib/helpers/gapless/capability.ts'
import type { TrackData } from '$lib/library/get/value-queries.ts'
import type { AudioGraph } from '../audio-graph.ts'
import { AudioBufferEngine } from './audio-buffer-engine.svelte.ts'
import type { AudioEngine, LoadResult } from './audio-engine.ts'
import { HTMLAudioEngine } from './html-audio-engine.svelte.ts'

/**
 * Manages two AudioEngine instances: `#current` (playing now) and `#next`
 * (pre-buffered for gapless transition or crossfade).
 *
 * Responsibilities:
 * - Creates the right engine type per track (HTMLAudio vs AudioBuffer).
 * - Wires onEnded/onError callbacks and drives transitions.
 * - Exposes unified loading/currentTime/duration state to PlayerStore.
 * - Tracks currentTrackId so PlayerStore can skip redundant loads after
 *   a gapless transition has already advanced the engine.
 *
 * NOT responsible for:
 * - Queue management (PlayerStore's job).
 * - Pre-buffer timing (PlayerStore watches currentTime and calls preloadNext).
 * - File resolution (PlayerStore calls resolveTrackFile and passes Blob).
 * @public
 */
export class EngineCoordinator {
	readonly #graph: AudioGraph
	readonly #gaplessEnabled: () => boolean

	#current: AudioEngine | null = $state(null)
	#next: AudioEngine | null = $state(null)

	get currentTrackId() {
		return this.#current?.trackId ?? null
	}

	// The AudioContext time at which the current track ends.
	// Passed as scheduleAt when preloading the next track.
	#currentEndTime = 0

	// Delegated reactive state — updates whenever the current engine changes.
	loading: boolean = $derived(this.#current?.loading ?? false)
	currentTime: number = $derived(this.#current?.currentTime ?? 0)
	duration: number = $derived(this.#current?.duration ?? 0)

	onTrackEnded: (() => void) | null = null

	/** Fired when an unrecoverable error occurs on the current engine. */
	onError: (() => void) | null = null

	constructor(graph: AudioGraph, gaplessEnabled: () => boolean) {
		this.#graph = graph
		this.#gaplessEnabled = gaplessEnabled
	}

	/**
	 * Load a new track as the current track.
	 * Aborts any existing current and next engines.
	 */
	async loadCurrent(track: TrackData, blob: Blob): Promise<LoadResult> {
		// If a next engine was pre-buffered, discard it.
		this.#disposeNext()

		const engine = this.#createEngine(track)
		this.#wireCurrent(engine)
		this.#current?.dispose()
		this.#current = engine

		const result = await engine.load(blob)
		if (result.status === 'loaded') {
			this.#currentEndTime = result.endTime
		}
		return result
	}

	/**
	 * Pre-buffer the next track so it can start immediately after the current one.
	 * For AudioBufferEngine → AudioBufferEngine transitions, schedules the next
	 * track at exactly the current track's end time (true gapless).
	 * For any other combination, loads immediately without scheduling.
	 */
	async preloadNext(track: TrackData, blob: Blob): Promise<LoadResult> {
		this.#disposeNext()

		const currentIsBuffer = this.#current instanceof AudioBufferEngine
		const nextEngine = this.#createEngine(track)
		this.#next = nextEngine

		const scheduleAt =
			currentIsBuffer && nextEngine instanceof AudioBufferEngine
				? this.#currentEndTime
				: undefined

		const result = await nextEngine.load(blob, scheduleAt)
		if (result.status === 'loaded') {
			// Store next track's endTime so the engine-after-next can chain.
			nextEngine['_endTime'] = result.endTime
		}
		return result
	}

	async play(): Promise<void> {
		await this.#current?.play()
	}

	pause(): void {
		this.#current?.pause()
	}

	/**
	 * Seek within the current track.
	 * Discards any pre-buffered next engine
	 */
	seek(time: number): void {
		this.#disposeNext()
		this.#current?.seek(time)
		this.#currentEndTime = this.#graph.context.currentTime + (this.duration - time)
	}

	abort(): void {
		this.#disposeNext()
		this.#current?.dispose()
		this.#current = null
		this.#currentEndTime = 0
	}

	#createEngine(track: TrackData): AudioEngine {
		if (this.#gaplessEnabled() && canTrackUseGapless(track)) {
			return new AudioBufferEngine(this.#graph, track.id, track.duration)
		}

		return new HTMLAudioEngine(this.#graph, track.id)
	}

	#wireCurrent(engine: AudioEngine): void {
		engine.onEnded = () => this.#handleCurrentEnded()
		engine.onError = () => this.onError?.()
	}

	#handleCurrentEnded(): void {
		console.log('[Coordinator] handleCurrentEnded', {
			hasNext: !!this.#next,
			currentTrackId: this.currentTrackId,
		})

		if (this.#next) {
			// Gapless: next engine is already playing.
			// Promote it to current and fire onTrackEnded so PlayerStore
			// advances the queue index.
			const next = this.#next

			this.#current?.dispose()
			this.#current = next
			this.#next = null

			// Carry over the next engine's stored endTime (set during preloadNext).
			this.#currentEndTime = (next as any)['_endTime'] ?? 0

			// Wire onEnded for the (now current) next engine's eventual end.
			next.onEnded = () => this.#handleCurrentEnded()

			void next.play()
		}

		// In both gapless and non-gapless cases, tell PlayerStore the track changed.
		this.onTrackEnded?.()
	}

	#disposeNext(): void {
		this.#next?.dispose()
		this.#next = null
	}
}
