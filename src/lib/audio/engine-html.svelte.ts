import { throttle } from '$lib/helpers/utils/throttle'
import type { AudioGraph } from './audio-graph.svelte.ts'
import {
	type AudioEngine,
	type AudioEngineOptions,
	CURRENT_TIME_UPDATE_TIMEOUT_MS,
} from './engine.ts'

export class HTMLAudioEngine implements AudioEngine {
	readonly #audio = new Audio()
	readonly #graph: AudioGraph
	readonly trackId: number

	readonly #signal: AbortSignal
	readonly #blob: Blob

	#gainNode: GainNode | null = null
	#sourceNode: MediaElementAudioSourceNode | null = null
	#currentSrc: string | null = null

	currentTime = $state(0)
	duration = $state(0)

	#playbackRate = 1
	#preservePitch = true

	onEnded: (() => void) | null = null
	onError: (() => void) | null = null

	constructor(options: AudioEngineOptions) {
		this.#graph = options.audioGraph
		this.trackId = options.trackId
		this.duration = options.duration
		this.#signal = options.signal
		this.#blob = options.blob
		this.#playbackRate = options.playbackRate
		this.#preservePitch = options.preservePitch
		this.#setupElement()

		this.#signal.addEventListener('abort', () => this.dispose(), { once: true })
	}

	#setupElement(): void {
		const audio = this.#audio

		audio.onended = () => {
			this.onEnded?.()
		}

		audio.ontimeupdate = throttle(() => {
			this.currentTime = audio.currentTime
		}, CURRENT_TIME_UPDATE_TIMEOUT_MS)

		audio.ondurationchange = () => {
			const d = audio.duration
			this.duration = Number.isFinite(d) ? d : 0
		}
	}

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

	async load(_scheduledAt?: number): Promise<void> {
		const audio = this.#audio

		this.#clearSrc()
		this.#ensureGraphConnection()

		this.#currentSrc = URL.createObjectURL(this.#blob)
		audio.src = this.#currentSrc

		const { promise, resolve, reject } = Promise.withResolvers<void>()

		audio.onloadedmetadata = () => {
			this.#updateAudioRate()
			audio.onloadedmetadata = null

			// Restore regular handler
			audio.onerror = () => {
				this.onError?.()
			}

			resolve()
		}

		audio.onerror = () => {
			audio.onloadedmetadata = null
			audio.onerror = null

			reject(new Error('Audio element error'))
		}

		await promise
	}

	setPlaybackRate(rate: number, preservePitch: boolean): void {
		this.#playbackRate = rate
		this.#preservePitch = preservePitch

		this.#updateAudioRate()
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

	dispose(): void {
		this.#audio.onended = null
		this.#audio.ontimeupdate = null
		this.#audio.ondurationchange = null
		this.#audio.onerror = null

		this.#clearSrc()
		this.#gainNode?.disconnect()
		this.#sourceNode?.disconnect()
		this.#gainNode = null
		this.#sourceNode = null
	}

	#updateAudioRate(): void {
		this.#audio.playbackRate = this.#playbackRate
		this.#audio.preservesPitch = this.#preservePitch
	}

	#clearSrc(): void {
		if (this.#currentSrc) {
			URL.revokeObjectURL(this.#currentSrc)
			this.#currentSrc = null
			this.#audio.src = ''
		}
	}
}
