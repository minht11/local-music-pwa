import { throttle } from '$lib/helpers/utils/throttle'
import type { AudioGraph } from '../audio-graph.ts'
import type { AudioEngine, LoadResult } from './audio-engine.ts'

/**
 * Plays audio via HTMLAudioElement routed through the shared AudioGraph.
 *
 * MediaElementAudioSourceNode is created once per engine instance on the
 * first load() call (requires user gesture / AudioContext to exist).
 * Subsequent load() calls just swap the blob URL on the same element.
 *
 * The engine's GainNode stays connected to audioGraph.inputNode for the
 * lifetime of the instance. Call dispose() to disconnect it.
 */
export class HTMLAudioEngine implements AudioEngine {
	readonly #audio = new Audio()
	readonly #graph: AudioGraph
	readonly trackId: number

	#gainNode: GainNode | null = null
	#sourceNode: MediaElementAudioSourceNode | null = null
	#currentSrc: string | null = null

	// Generation counter for stale-load detection.
	// Incremented on every load() and abort().
	#generation = 0

	loading: boolean = $state(false)
	currentTime: number = $state(0)
	duration: number = $state(0)

	onEnded: (() => void) | null = null
	onError: (() => void) | null = null

	constructor(graph: AudioGraph, trackId: number) {
		this.#graph = graph
		this.trackId = trackId
		this.#setupElement()
	}

	#setupElement(): void {
		const audio = this.#audio

		audio.onended = () => {
			this.onEnded?.()
		}

		audio.ontimeupdate = throttle(() => {
			this.currentTime = audio.currentTime
		}, 250)

		audio.ondurationchange = () => {
			const d = audio.duration
			this.duration = Number.isFinite(d) ? d : 0
		}

		audio.onerror = () => {
			this.loading = false
			this.onError?.()
		}
	}

	/**
	 * Creates the Web Audio graph connection on first call.
	 * Safe to call multiple times — idempotent.
	 */
	#ensureGraphConnection(): void {
		if (this.#gainNode) {
			return
		}

		const ctx = this.#graph.context
		this.#gainNode = ctx.createGain()
		this.#sourceNode = ctx.createMediaElementSource(this.#audio)
		this.#sourceNode.connect(this.#gainNode)
		this.#gainNode.connect(this.#graph.inputNode)
	}

	async load(blob: Blob, _scheduleAt?: number): Promise<LoadResult> {
		this.#generation += 1
		const gen = this.#generation

		this.loading = true
		this.#clearSrc()
		this.#ensureGraphConnection()

		// Wait for metadata so we can return a meaningful endTime.
		const metadataResult = await new Promise<'loaded' | 'error'>((resolve) => {
			this.#audio.onloadedmetadata = () => resolve('loaded')
			// Override onerror temporarily to capture load errors.
			this.#audio.onerror = () => resolve('error')
			this.#currentSrc = URL.createObjectURL(blob)
			this.#audio.src = this.#currentSrc
		})

		// Restore permanent error handler.
		this.#audio.onerror = () => {
			this.loading = false
			this.onError?.()
		}

		if (this.#generation !== gen) {
			return { status: 'failed', reason: 'superseded' }
		}

		this.loading = false

		if (metadataResult === 'error') {
			return { status: 'failed', reason: 'error' }
		}

		const duration = Number.isFinite(this.#audio.duration) ? this.#audio.duration : 0
		this.duration = duration

		// endTime is approximate for HTMLAudioEngine — not used for gapless scheduling.
		const endTime = this.#graph.context.currentTime + duration
		return { status: 'loaded', endTime }
	}

	async play(): Promise<void> {
		await this.#graph.resume()
		return this.#audio.play()
	}

	pause(): void {
		this.#audio.pause()
	}

	seek(time: number): void {
		this.currentTime = time
		this.#audio.currentTime = time
	}

	abort(): void {
		this.#generation += 1
		this.loading = false
		this.#clearSrc()
	}

	dispose(): void {
		this.abort()
		this.#gainNode?.disconnect()
		this.#sourceNode?.disconnect()
		this.#gainNode = null
		this.#sourceNode = null
		this.#audio.onended = null
		this.#audio.ontimeupdate = null
		this.#audio.ondurationchange = null
		this.#audio.onerror = null
		this.#audio.onloadedmetadata = null
	}

	#clearSrc(): void {
		if (this.#currentSrc) {
			URL.revokeObjectURL(this.#currentSrc)
			this.#currentSrc = null
		}
		this.#audio.removeAttribute('src')
		this.#audio.load()
	}
}
