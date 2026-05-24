import { canTrackUseGapless } from '$lib/helpers/gapless/capability.ts'
import type { TrackData } from '$lib/library/get/value-queries.ts'
import type { AudioGraph } from './audio-graph.ts'
import type { AudioEngine, LoadFailReason } from './engine.ts'
import { AudioBufferEngine } from './engine-buffer.svelte.ts'
import { HTMLAudioEngine } from './engine-html.svelte.ts'

export type LoaderResult =
	| { status: 'loaded'; file: File; track: TrackData }
	| { status: LoadFailReason }

export type TrackLoader = () => Promise<LoaderResult>

type SharedState =
	| { status: 'idle' }
	| { status: 'loading'; trackId: number; controller: AbortController }
	| { status: 'ready'; trackId: number; engine: AudioEngine }

type CurrentState = SharedState | { status: 'failed'; trackId: number; reason: LoadFailReason }

type NextState = SharedState | { status: 'unavailable'; trackId: number }

type EngineLoadOutcome =
	| { status: 'ok' }
	| { status: 'aborted' }
	| { status: 'failed'; reason: LoadFailReason }

const runLoader = async (
	loader: TrackLoader,
	signal: AbortSignal,
): Promise<LoaderResult | null> => {
	const data = await loader().catch(() => ({ status: 'error' }) as const)

	return signal.aborted ? null : data
}

const loadEngine = async (
	engine: AudioEngine,
	file: File,
	signal: AbortSignal,
	scheduleAt?: number,
): Promise<EngineLoadOutcome> => {
	const loaded = await engine.load(file, scheduleAt)

	if (signal.aborted) {
		engine.dispose()

		return { status: 'aborted' }
	}

	if (loaded.status === 'loaded') {
		return { status: 'ok' }
	}

	return loaded
}

interface EngineCoordinatorOptions {
	onTrackEnd: () => 'advance' | 'repeat'
	onTrackEnded: (wasGaplessPromotion: boolean) => void
	onError: (reason: Exclude<LoadFailReason, 'superseded'>) => void
	isGaplessEnabled: () => boolean
}

/** @public */
export class EngineCoordinator {
	readonly #graph: AudioGraph
	readonly #options: EngineCoordinatorOptions

	#current: CurrentState = $state({ status: 'idle' })
	#next: NextState = $state({ status: 'idle' })

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

		const data = await runLoader(loader, controller.signal)
		if (data === null) {
			return
		}

		if (data.status !== 'loaded') {
			this.playing = false
			this.#current = { status: 'failed', trackId, reason: data.status }
			this.#options.onError(data.status)
			return
		}

		const engine = this.#createEngine(data.track)
		const outcome = await loadEngine(engine, data.file, controller.signal)
		if (outcome.status === 'aborted') {
			return
		}

		if (outcome.status === 'failed') {
			this.playing = false
			this.#current = { status: 'failed', trackId, reason: outcome.reason }
			this.#options.onError(outcome.reason)

			return
		}

		this.#readyCurrentWith(engine, trackId)
		if (this.playing) {
			void engine.play()
		}
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

		const current = this.#current
		const gaplessPossible =
			current.status === 'ready' &&
			current.engine instanceof AudioBufferEngine &&
			this.#options.isGaplessEnabled()

		this.#teardownAndIdleNext()

		if (!gaplessPossible) {
			this.#next = { status: 'unavailable', trackId }
			return
		}

		const controller = new AbortController()
		this.#next = { status: 'loading', trackId, controller }

		const data = await runLoader(loader, controller.signal)
		if (data === null) {
			return
		}

		if (data.status !== 'loaded') {
			this.#next = { status: 'unavailable', trackId }
			return
		}

		if (!this.#canUseGaplessForTrack(data.track)) {
			this.#next = { status: 'unavailable', trackId }
			return
		}

		// current.engine captured before the awaits above. If #current changed during
		// the load, load() would have called #teardownAndIdleNext(), aborting our
		// signal — the check above covers that race.
		const currentEngine = current.engine as AudioBufferEngine
		const engine = new AudioBufferEngine(this.#graph, trackId, data.track.duration)
		const scheduleAt = currentEngine.endTime
		const outcome = await loadEngine(engine, data.file, controller.signal, scheduleAt)

		if (outcome.status === 'aborted') {
			return
		}

		if (outcome.status === 'failed') {
			this.#next = { status: 'unavailable', trackId }
			return
		}

		this.#next = { status: 'ready', trackId, engine }
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
		const policy = this.#options.onTrackEnd()
		const canPromote = next.status === 'ready' && policy === 'advance'

		this.#teardownCurrent()
		this.#current = { status: 'idle' }

		if (canPromote) {
			this.#next = { status: 'idle' }
			this.#readyCurrentWith(next.engine, next.trackId)
			if (this.playing) {
				void next.engine.play()
			}
			this.#options.onTrackEnded(true)
		} else {
			this.#teardownAndIdleNext()
			this.#options.onTrackEnded(false)
		}
	}

	#canUseGaplessForTrack(track: TrackData): boolean {
		return this.#options.isGaplessEnabled() && canTrackUseGapless(track)
	}

	#createEngine(track: TrackData): AudioEngine {
		if (this.#canUseGaplessForTrack(track)) {
			return new AudioBufferEngine(this.#graph, track.id, track.duration)
		}
		return new HTMLAudioEngine(this.#graph, track.id, track.duration)
	}

	#readyCurrentWith(engine: AudioEngine, trackId: number): void {
		engine.onEnded = () => this.#handleCurrentEnded()
		engine.onError = () => this.#options.onError('error')
		this.#current = { status: 'ready', trackId, engine }
		this.duration = engine.duration
	}

	#teardown(slot: SharedState): void {
		if (slot.status === 'loading') {
			slot.controller.abort()
		} else if (slot.status === 'ready') {
			slot.engine.dispose()
		}
	}

	#teardownCurrent(): void {
		const current = this.#current
		if (current.status === 'loading' || current.status === 'ready') {
			this.#teardown(current)
		}
	}

	#teardownAndIdleNext(): void {
		const next = this.#next
		if (next.status === 'loading' || next.status === 'ready') {
			this.#teardown(next)
		}
		this.#next = { status: 'idle' }
	}
}
