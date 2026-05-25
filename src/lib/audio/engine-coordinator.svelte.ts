import { canTrackUseGapless } from '$lib/helpers/gapless/capability.ts'
import type { TrackData } from '$lib/library/get/value-queries.ts'
import type { AudioGraph } from './audio-graph.ts'
import type { AudioEngine, AudioEngineOptions, LoadFailReason } from './engine.ts'
import { AudioBufferEngine } from './engine-buffer.svelte.ts'
import { HTMLAudioEngine } from './engine-html.svelte.ts'

export type LoaderResult =
	| { status: 'loaded'; file: File; track: TrackData }
	| { status: LoadFailReason }

export type TrackLoader = () => Promise<LoaderResult>

type EngineState =
	| { status: 'idle' }
	| { status: 'loading'; trackId: number; controller: AbortController }
	| { status: 'ready'; trackId: number; engine: AudioEngine; controller: AbortController }
	| { status: 'failed'; trackId: number; reason: LoadFailReason | 'unavailable' }

interface EngineCoordinatorOptions {
	trackEndPolicy: () => 'advance' | 'repeat'
	onTrackEnded: () => void
	onError: (reason: LoadFailReason) => void
	isGaplessEnabled: () => boolean
}

/** @public */
export class EngineCoordinator {
	readonly #graph: AudioGraph
	readonly #options: EngineCoordinatorOptions

	#current: Readonly<EngineState> = $state.raw({ status: 'idle' })
	#next: Readonly<EngineState> = $state.raw({ status: 'idle' })

	playing: boolean = $state(false)
	duration: number = $state(0)

	get currentTrackId(): number | null {
		const s = this.#current
		return s.status === 'idle' ? null : s.trackId
	}

	get currentStatus(): 'idle' | 'loading' | 'ready' | 'failed' {
		return this.#current.status
	}

	get nextTrackId(): number | null {
		const s = this.#next
		return s.status === 'idle' ? null : s.trackId
	}

	readonly loading = $derived(this.#current.status === 'loading')
	currentTime = $derived(this.#current.status === 'ready' ? this.#current.engine.currentTime : 0)

	constructor(graph: AudioGraph, options: EngineCoordinatorOptions) {
		this.#graph = graph
		this.#options = options

		if (import.meta.hot) {
			this.abort()
		}
	}

	/**
	 * Load a track into the current slot. Idempotent: calling with the same track while
	 * already loading or ready is a no-op. Calling with a failed track retries the load.
	 * Resets currentTime eagerly and shows provisionalDuration while the engine loads.
	 */
	async load(trackId: number, loader: TrackLoader, provisionalDuration = 0): Promise<void> {
		const current = this.#current
		if (
			(current.status === 'loading' || current.status === 'ready') &&
			current.trackId === trackId
		) {
			return
		}

		this.#teardownCurrent()
		this.#teardownAndIdleNext()

		this.currentTime = 0
		this.duration = provisionalDuration

		const controller = new AbortController()
		this.#current = { status: 'loading', trackId, controller }

		const result = await this.#createAndLoadEngine(loader, controller.signal)
		if (result.status === 'aborted') {
			return
		}

		if (result.status === 'failed') {
			this.playing = false
			this.#current = { status: 'failed', trackId, reason: result.reason }
			this.#options.onError(result.reason)
			return
		}

		this.#readyCurrent(result.engine, trackId, controller)
	}

	/**
	 * Queue the next track for gapless pre-buffering. Idempotent: same track already
	 * in a non-idle state → no-op. Marks unavailable immediately if gapless is not
	 * possible, avoiding an unnecessary file load.
	 */
	async scheduleNext(trackId: number, loader: TrackLoader): Promise<void> {
		const next = this.#next
		if (next.status !== 'idle' && next.trackId === trackId) {
			return
		}

		this.#teardownAndIdleNext()

		const current = this.#current
		const currentEngine = current.status === 'ready' ? current.engine : null

		const gaplessPossible =
			currentEngine instanceof AudioBufferEngine && this.#options.isGaplessEnabled()

		if (!gaplessPossible) {
			this.#next = { status: 'failed', trackId, reason: 'unavailable' }
			return
		}

		const controller = new AbortController()
		this.#next = { status: 'loading', trackId, controller }

		const wrappedLoader: TrackLoader = async () => {
			const data = await loader()

			if (data.status === 'loaded' && !this.#canUseGaplessForTrack(data.track)) {
				return { status: 'error' }
			}

			return data
		}

		const result = await this.#createAndLoadEngine(
			wrappedLoader,
			controller.signal,
			currentEngine.endTime,
		)

		if (result.status === 'aborted') {
			return
		}

		if (result.status === 'failed') {
			this.#next = { status: 'failed', trackId, reason: 'unavailable' }
			return
		}

		this.#next = { status: 'ready', trackId, engine: result.engine, controller }
	}

	play(): void {
		this.playing = true
		if (this.#current.status === 'ready') {
			void this.#current.engine.play()
		}
	}

	pause(): void {
		this.playing = false
		if (this.#current.status === 'ready') {
			this.#current.engine.pause()
		}
	}

	seek(time: number): void {
		this.currentTime = time
		this.#teardownAndIdleNext()
		if (this.#current.status === 'ready') {
			this.#current.engine.seek(time)
		}
	}

	abort(): void {
		this.playing = false
		this.duration = 0
		if (this.#current.status !== 'idle') {
			this.#teardownCurrent()
			this.#current = { status: 'idle' }
		}
		this.#teardownAndIdleNext()
	}

	#handleCurrentEnded(): void {
		const next = this.#next
		const policy = this.#options.trackEndPolicy()
		const canPromote = next.status === 'ready' && policy === 'advance'

		this.#teardownCurrent()
		this.#current = { status: 'idle' }

		if (canPromote) {
			this.#next = { status: 'idle' }
			this.#readyCurrent(next.engine, next.trackId, next.controller)
		} else {
			this.#teardownAndIdleNext()
		}

		this.#options.onTrackEnded()
	}

	#canUseGaplessForTrack(track: TrackData): boolean {
		return this.#options.isGaplessEnabled() && canTrackUseGapless(track)
	}

	async #createAndLoadEngine(loader: TrackLoader, signal: AbortSignal, scheduleAt?: number) {
		const data = await loader().catch(() => ({ status: 'error' }) as const)

		if (signal.aborted) {
			return { status: 'aborted' } as const
		}

		if (data.status !== 'loaded') {
			return { status: 'failed', reason: data.status } as const
		}

		const engine = this.#createEngine(data.track, data.file, signal)
		const loadOutcome = await engine.load(scheduleAt)

		if (loadOutcome.status === 'loaded') {
			return { status: 'loaded', engine } as const
		}

		return loadOutcome
	}

	#createEngine(track: TrackData, blob: Blob, signal: AbortSignal): AudioEngine {
		const options: AudioEngineOptions = {
			audioGraph: this.#graph,
			trackId: track.id,
			duration: track.duration,
			blob,
			signal,
		}

		if (this.#canUseGaplessForTrack(track)) {
			return new AudioBufferEngine(options)
		}

		return new HTMLAudioEngine(options)
	}

	#readyCurrent(engine: AudioEngine, trackId: number, controller: AbortController): void {
		engine.onEnded = () => this.#handleCurrentEnded()
		engine.onError = () => this.#options.onError('error')
		this.#current = { status: 'ready', trackId, engine, controller }
		this.duration = engine.duration

		if (this.playing) {
			void engine.play()
		}
	}

	#teardown(engineState: EngineState): void {
		if (engineState.status === 'loading' || engineState.status === 'ready') {
			engineState.controller.abort()
		}
	}

	#teardownCurrent(): void {
		this.#teardown(this.#current)
	}

	#teardownAndIdleNext(): void {
		this.#teardown(this.#next)

		this.#next = { status: 'idle' }
	}
}
