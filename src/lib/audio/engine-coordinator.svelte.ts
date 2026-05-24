import { canTrackUseGapless } from '$lib/helpers/gapless/capability.ts'
import type { TrackData } from '$lib/library/get/value-queries.ts'
import type { AudioGraph } from './audio-graph.ts'
import type { AudioEngine, LoadResult } from './engine.ts'
import { AudioBufferEngine } from './engine-buffer.svelte.ts'
import { HTMLAudioEngine } from './engine-html.svelte.ts'

interface EngineCoordinatorOptions {
	onTrackEnded: (wasGaplessPromotion: boolean) => void
	onError: () => void
	isGaplessEnabled: () => boolean
}

/** @public */
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
	loadCurrent(track: TrackData, blob: Blob): Promise<LoadResult> {
		this.#disposeNext()

		const engine = this.#createEngine(track, this.#canUseGaplessForTrack(track))
		this.#current?.dispose()
		this.#current = engine
		this.#wireCurrent(engine)

		return engine.load(blob)
	}

	/**
	 * Pre-buffer the next track so it can start immediately after the current one.
	 * Only effective if the current and next tracks are both gapless-capable. Noop otherwise.
	 */
	async preloadNext(track: TrackData, blob: Blob): Promise<void> {
		this.#disposeNext()

		if (!(this.#current instanceof AudioBufferEngine)) {
			return
		}

		const nextTrackCanUseGapless = this.#canUseGaplessForTrack(track)
		if (!nextTrackCanUseGapless) {
			return
		}

		const nextEngine = this.#createEngine(track, nextTrackCanUseGapless)
		this.#next = nextEngine

		// Pick up from current engine's end time so next track plays seamlessly
		const scheduleAt = this.#current.endTime

		await nextEngine.load(blob, scheduleAt)
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

	#canUseGaplessForTrack(track: TrackData): boolean {
		return this.#options.isGaplessEnabled() && canTrackUseGapless(track)
	}

	#createEngine(track: TrackData, gapless: boolean): AudioEngine {
		if (gapless) {
			return new AudioBufferEngine(this.#graph, track.id, track.duration)
		}

		return new HTMLAudioEngine(this.#graph, track.id)
	}

	#wireCurrent(engine: AudioEngine): void {
		engine.onEnded = () => this.#handleCurrentEnded()
		engine.onError = () => this.#options.onError()
	}

	#handleCurrentEnded(): void {
		const nextEngine = this.#next
		const wasGaplessPromotion = nextEngine !== null

		if (nextEngine) {
			// Promote the pre-buffered next engine to current.
			// AudioBufferEngine: buffers are already scheduled on the AudioContext
			// timeline and play automatically. HTMLAudioEngine: loaded but idle,
			// play() is what actually starts the element.
			this.#current?.dispose()
			this.#next = null

			this.#current = nextEngine
			this.#wireCurrent(nextEngine)

			void nextEngine.play()
		}

		this.#options.onTrackEnded(wasGaplessPromotion)
	}

	#disposeNext(): void {
		this.#next?.dispose()
		this.#next = null
	}
}
