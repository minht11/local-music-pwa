import { throttle } from '$lib/helpers/utils/throttle'
import type { AudioGraph } from './audio-graph.ts'
import type { AudioEngine, LoadResult } from './engine.ts'

export class HTMLAudioEngine implements AudioEngine {
	readonly #audio = new Audio()
	readonly #graph: AudioGraph
	readonly trackId: number

	#gainNode: GainNode | null = null
	#sourceNode: MediaElementAudioSourceNode | null = null
	#currentSrc: string | null = null

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

	load(blob: Blob, _scheduleAt?: number): Promise<LoadResult> {
		this.loading = true
		this.#clearSrc()
		this.#ensureGraphConnection()

		this.#currentSrc = URL.createObjectURL(blob)
		this.#audio.src = this.#currentSrc

		this.loading = false

		const duration = Number.isFinite(this.#audio.duration) ? this.#audio.duration : 0
		this.duration = duration

		return Promise.resolve({ status: 'loaded' })
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
