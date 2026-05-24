import { canTrackUseGapless } from '$lib/helpers/gapless/capability.ts'
import type { TrackData } from '$lib/library/get/value-queries.ts'
import type { AudioGraph } from '../audio-graph.ts'
import { AudioBufferEngine } from './audio-buffer-engine.svelte.ts'
import type { AudioEngine, LoadResult } from './audio-engine.ts'
import { HTMLAudioEngine } from './html-audio-engine.svelte.ts'

interface EngineCoordinatorOptions {
	onTrackEnded: () => void
	onError: () => void
	isGaplessEnabled: () => boolean
}

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
	readonly #options: EngineCoordinatorOptions

	#current: AudioEngine | null = $state(null)
	#next: AudioEngine | null = $state(null)

	get currentTrackId() {
		return this.#current?.trackId ?? null
	}

	readonly loading: boolean = $derived(this.#current?.loading ?? false)
	readonly currentTime: number = $derived(this.#current?.currentTime ?? 0)
	readonly duration: number = $derived(this.#current?.duration ?? 0)

	constructor(graph: AudioGraph, options: EngineCoordinatorOptions) {
		this.#graph = graph
		this.#options = options
	}

	/**
	 * Load a new track as the current track.
	 * Aborts any existing current and next engines.
	 */
	loadCurrent(track: TrackData, blob: Blob): Promise<LoadResult> | LoadResult {
		this.#disposeNext()

		const engine = this.#createEngine(track)
		this.#wireCurrent(engine)
		this.#current?.dispose()
		this.#current = engine

		return engine.load(blob)
	}

	/**
	 * Pre-buffer the next track so it can start immediately after the current one.
	 * For AudioBufferEngine → AudioBufferEngine transitions, schedules the next
	 * track at exactly the current track's end time (true gapless).
	 * For any other combination, loads immediately without scheduling.
	 */
	async preloadNext(track: TrackData, blob: Blob): Promise<LoadResult> {
		this.#disposeNext()

		const nextEngine = this.#createEngine(track)
		this.#next = nextEngine

		const scheduleAt =
			this.#current instanceof AudioBufferEngine && nextEngine instanceof AudioBufferEngine
				? this.#current?.endTime
				: undefined

		return await nextEngine.load(blob, scheduleAt)
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
	}

	abort(): void {
		this.#disposeNext()
		this.#current?.dispose()
		this.#current = null
	}

	#createEngine(track: TrackData): AudioEngine {
		if (this.#options.isGaplessEnabled() && canTrackUseGapless(track)) {
			return new AudioBufferEngine(this.#graph, track.id, track.duration)
		}

		return new HTMLAudioEngine(this.#graph, track.id)
	}

	#wireCurrent(engine: AudioEngine): void {
		engine.onEnded = () => this.#handleCurrentEnded()
		engine.onError = () => this.#options.onError()
	}

	#handleCurrentEnded(): void {
		if (this.#next) {
			// Next engine is already playing, promote it to current
			const newCurrent = this.#next

			this.#current?.dispose()
			this.#current = newCurrent
			this.#next = null

			this.#wireCurrent(newCurrent)

			newCurrent.play()
		}

		this.#options.onTrackEnded()
	}

	#disposeNext(): void {
		this.#next?.dispose()
		this.#next = null
	}
}
