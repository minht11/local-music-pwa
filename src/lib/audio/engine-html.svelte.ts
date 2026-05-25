import { throttle } from '$lib/helpers/utils/throttle'
import type { AudioGraph } from './audio-graph.ts'
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

	loading: boolean = $state(false)
	currentTime: number = $state(0)
	duration: number = $state(0)

	onEnded: (() => void) | null = null
	onError: (() => void) | null = null

	constructor(options: AudioEngineOptions) {
		this.#graph = options.audioGraph
		this.trackId = options.trackId
		this.duration = options.duration
		this.#signal = options.signal
		this.#blob = options.blob
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

		audio.onerror = () => {
			this.loading = false
			this.onError?.()
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

	load(_scheduledAt?: number): Promise<void> {
		this.loading = true
		this.#clearSrc()
		this.#ensureGraphConnection()

		this.#currentSrc = URL.createObjectURL(this.#blob)
		this.#audio.src = this.#currentSrc

		this.loading = false

		return Promise.resolve()
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
		this.loading = false
		this.#clearSrc()
		this.#gainNode?.disconnect()
		this.#sourceNode?.disconnect()
		this.#gainNode = null
		this.#sourceNode = null
		this.#audio.onended = null
		this.#audio.ontimeupdate = null
		this.#audio.ondurationchange = null
		this.#audio.onerror = null
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
