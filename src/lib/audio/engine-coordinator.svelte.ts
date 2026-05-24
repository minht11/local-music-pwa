import { canTrackUseGapless } from '$lib/helpers/gapless/capability.ts'
import type { TrackData } from '$lib/library/get/value-queries.ts'
import type { AudioGraph } from './audio-graph.ts'
import type { AudioEngine, LoadResult } from './engine.ts'
import { AudioBufferEngine } from './engine-buffer.svelte.ts'
import { HTMLAudioEngine } from './engine-html.svelte.ts'

interface EngineCoordinatorOptions {
	onTrackEnded: () => void
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

		const engine = this.#createEngine(track)
		this.#current?.dispose()
		this.#current = engine
		this.#wireCurrent(engine)

		return engine.load(blob)
	}

	/**
	 * Pre-buffer the next track so it can start immediately after the current one.
	 */
	preloadNext(track: TrackData, blob: Blob): Promise<LoadResult> {
		this.#disposeNext()

		const nextEngine = this.#createEngine(track)
		this.#next = nextEngine

		const scheduleAt =
			this.#current instanceof AudioBufferEngine && nextEngine instanceof AudioBufferEngine
				? this.#current.endTime
				: undefined

		return nextEngine.load(blob, scheduleAt)
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
			// Promote the pre-buffered next engine to current.
			// AudioBufferEngine: buffers are already scheduled on the AudioContext
			// timeline and play automatically. HTMLAudioEngine: loaded but idle,
			// play() is what actually starts the element.
			const newCurrent = this.#next

			this.#current?.dispose()
			this.#next = null

			this.#current = newCurrent
			this.#wireCurrent(newCurrent)

			void newCurrent.play()
		}

		this.#options.onTrackEnded()
	}

	#disposeNext(): void {
		this.#next?.dispose()
		this.#next = null
	}
}
