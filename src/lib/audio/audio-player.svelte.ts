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

type EngineLoadResult =
	| { status: 'loaded'; engine: AudioEngine }
	| { status: 'aborted' }
	| { status: 'failed'; reason: FileLoadFailReason }

interface EngineStateIdle {
	status: 'idle'
}
interface EngineStateLoading {
	status: 'loading'
	trackId: number
	controller: AbortController
}
interface EngineStateReady {
	status: 'ready'
	trackId: number
	engine: AudioEngine
	controller: AbortController
}
interface EngineStateFailed {
	status: 'failed'
	trackId: number
	reason: FileLoadFailReason | 'unavailable'
}

type EngineState = EngineStateIdle | EngineStateLoading | EngineStateReady | EngineStateFailed

const idle = (): EngineStateIdle => ({ status: 'idle' })

const failed = (
	trackId: number,
	reason: FileLoadFailReason | 'unavailable',
): EngineStateFailed => ({
	status: 'failed',
	trackId,
	reason,
})

const createStateTransition = (trackId: number) => {
	const controller = new AbortController()

	return {
		loading: (): EngineStateLoading => ({ status: 'loading', trackId, controller }),
		ready: (engine: AudioEngine): EngineStateReady => ({
			status: 'ready',
			trackId,
			engine,
			controller,
		}),
		failed: (reason: EngineStateFailed['reason']): EngineStateFailed => failed(trackId, reason),
	}
}

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

	#current: Readonly<EngineState> = $state.raw(idle())
	#next: Readonly<EngineState> = $state.raw(idle())

	#playbackRate = 1
	#preservePitch = true

	playing = $state(false)
	duration = $state(0)

	get currentTrackId() {
		const s = this.#current
		return s.status === 'idle' ? null : s.trackId
	}

	get currentStatus() {
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

		this.duration = provisionalDuration

		const transition = createStateTransition(trackId)
		this.#current = transition.loading()

		const result = await this.#tryLoadingEngine(loader, {
			signal: this.#current.controller.signal,
		})

		if (result.status === 'aborted') {
			return
		}

		if (result.status === 'failed') {
			this.playing = false
			this.#current = transition.failed(result.reason)
			this.#options.onError(result.reason)
			return
		}

		this.#promoteToCurrent(transition.ready(result.engine))
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
			this.#next = failed(trackId, 'unavailable')
			return
		}

		const transition = createStateTransition(trackId)
		this.#next = transition.loading()

		const result = await this.#tryLoadingEngine(loader, {
			signal: this.#next.controller.signal,
			mustBeGapless: true,
			scheduleAt: () => currentEngine.endTime,
		})

		if (result.status === 'aborted') {
			return
		}

		if (result.status === 'failed') {
			this.#next = transition.failed('unavailable')
			return
		}

		this.#next = transition.ready(result.engine)
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
			this.#current = idle()
		}
		this.#teardownAndIdleNext()
	}

	#handleCurrentEnded(): void {
		const next = this.#next
		const policy = this.#options.trackEndPolicy()
		const canPromote = next.status === 'ready' && policy === 'advance'

		this.#teardownCurrent()

		if (canPromote) {
			this.#next = idle()
			this.#promoteToCurrent(next)
		} else {
			this.#current = idle()
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

	#promoteToCurrent(readyState: EngineStateReady): void {
		const { engine } = readyState
		engine.onEnded = () => this.#handleCurrentEnded()
		engine.onError = () => this.#options.onError('error')
		this.#current = readyState
		this.duration = engine.duration

		if (this.playing) {
			void engine.play()
		}
	}

	#teardown(transition: Readonly<EngineState>) {
		if (transition.status === 'loading' || transition.status === 'ready') {
			transition.controller.abort()
		}
	}

	#teardownCurrent() {
		this.#teardown(this.#current)
	}

	#teardownAndIdleNext() {
		this.#teardown(this.#next)
		this.#next = idle()
	}
}
