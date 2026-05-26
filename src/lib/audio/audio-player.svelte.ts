import type { FileLoadFailReason } from '$lib/helpers/file-resolver.ts'
import type { TrackData } from '$lib/library/get/value-queries.ts'
import type { AudioGraph } from './audio-graph.svelte.ts'
import type { AudioEngine, AudioEngineOptions } from './engine.ts'
import { AudioBufferEngine, supportsBufferEngine } from './engine-buffer.svelte.ts'
import { HTMLAudioEngine } from './engine-html.svelte.ts'

type TrackLoaderResult =
	| { status: 'loaded'; file: File; track: TrackData }
	| { status: FileLoadFailReason }

export type TrackLoader = () => Promise<TrackLoaderResult>

type EngineState =
	| { status: 'idle' }
	| { status: 'loading'; trackId: number; controller: AbortController }
	| { status: 'ready'; trackId: number; engine: AudioEngine; controller: AbortController }
	| { status: 'failed'; trackId: number; reason: FileLoadFailReason | 'unavailable' }

type EngineLoadResult =
	| { status: 'loaded'; engine: AudioEngine }
	| { status: 'aborted' }
	| { status: 'failed'; reason: FileLoadFailReason }

interface AudioPlayerOptions {
	trackEndPolicy: () => 'advance' | 'repeat'
	onTrackEnded: () => void
	onError: (reason: FileLoadFailReason) => void
	isGaplessEnabled: () => boolean
}

interface TryLoadEngineOptions {
	signal: AbortSignal
	// Using getter so that we can get latest value, only when we actually start loading the audio
	scheduleAt?: () => number
	mustBeGapless?: boolean
}

/** @public */
export class AudioPlayer {
	readonly #graph: AudioGraph
	readonly #options: AudioPlayerOptions

	#current: Readonly<EngineState> = $state.raw({ status: 'idle' })
	#next: Readonly<EngineState> = $state.raw({ status: 'idle' })

	#playbackRate = 1
	#preservePitch = true

	playing: boolean = $state(false)
	duration: number = $state(0)

	get currentTrackId(): number | null {
		const s = this.#current
		return s.status === 'idle' ? null : s.trackId
	}

	get currentStatus(): 'idle' | 'loading' | 'ready' | 'failed' {
		return this.#current.status
	}

	get nextScheduledTrackId(): number | null {
		const s = this.#next
		return s.status === 'idle' ? null : s.trackId
	}

	readonly loading = $derived(this.#current.status === 'loading')
	currentTime = $derived(this.#current.status === 'ready' ? this.#current.engine.currentTime : 0)

	constructor(graph: AudioGraph, options: AudioPlayerOptions) {
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
		this.playing = true
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

		const result = await this.#tryLoadingEngine(loader, {
			signal: controller.signal,
		})

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

		const canTryGapless =
			currentEngine instanceof AudioBufferEngine && this.#options.isGaplessEnabled()

		if (!canTryGapless) {
			this.#next = { status: 'failed', trackId, reason: 'unavailable' }
			return
		}

		const controller = new AbortController()
		this.#next = { status: 'loading', trackId, controller }

		const result = await this.#tryLoadingEngine(loader, {
			signal: controller.signal,
			mustBeGapless: true,
			scheduleAt: () => currentEngine.endTime,
		})

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

	#canUseBufferEngine(track: TrackData): Promise<boolean> | boolean {
		if (this.#options.isGaplessEnabled()) {
			return supportsBufferEngine(track.format?.codec ?? '')
		}

		return false
	}

	async #tryLoadingEngine(
		loader: TrackLoader,
		options: TryLoadEngineOptions,
	): Promise<EngineLoadResult> {
		const { scheduleAt, mustBeGapless, signal } = options

		try {
			const trackData = await loader()
			signal.throwIfAborted()

			if (trackData.status !== 'loaded') {
				return { status: 'failed', reason: trackData.status }
			}

			const { track } = trackData

			const canUseBufferEngine = await this.#canUseBufferEngine(track)
			signal.throwIfAborted()

			const engineOptions: AudioEngineOptions = {
				audioGraph: this.#graph,
				trackId: track.id,
				duration: track.duration,
				blob: trackData.file,
				signal,
				playbackRate: this.#playbackRate,
				preservePitch: this.#preservePitch,
			}

			let engine: AudioEngine
			if (canUseBufferEngine) {
				engine = new AudioBufferEngine(engineOptions)
			} else if (mustBeGapless) {
				return { status: 'failed', reason: 'error' }
			} else {
				engine = new HTMLAudioEngine(engineOptions)
			}

			await engine.load(scheduleAt?.())
			signal.throwIfAborted()

			return { status: 'loaded', engine }
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') {
				return { status: 'aborted' }
			}

			console.error('[engine error]:', error)

			return { status: 'failed', reason: 'error' }
		}
	}

	setPlaybackRate(rate: number, preservePitch: boolean): void {
		this.#playbackRate = rate
		this.#preservePitch = preservePitch
		this.#teardownAndIdleNext()
		if (this.#current.status === 'ready') {
			this.#current.engine.setPlaybackRate(rate, preservePitch)
		}
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
