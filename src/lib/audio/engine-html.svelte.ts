import { createAbortError } from '$lib/helpers/utils/errors.ts'
import { throttle } from '$lib/helpers/utils/throttle'
import type { AudioGraph } from './audio-graph.svelte.ts'
import {
	type AudioEngineImpl,
	type AudioEngineOptions,
	CURRENT_TIME_UPDATE_TIMEOUT_MS,
} from './engine.ts'

interface HTMLAudioEngineOptions {
	audioGraph: AudioGraph
	audio: HTMLAudioElement
	signal: AbortSignal
	preservePitch: boolean
	playbackRate: number
}

export class HTMLAudioEngine implements AudioEngineImpl {
	readonly #audio: HTMLAudioElement
	readonly #graph: AudioGraph

	readonly #signal: AbortSignal

	readonly duration: number

	readonly buffering = false

	get ended(): boolean {
		return this.#audio.ended
	}

	#gainNode: GainNode | null = null
	#sourceNode: MediaElementAudioSourceNode | null = null

	currentTime = $state(0)

	#playbackRate = 1
	#preservePitch = true

	onEnded: (() => void) | null = null
	onError: (() => void) | null = null

	constructor(options: HTMLAudioEngineOptions) {
		this.#graph = options.audioGraph
		this.#signal = options.signal
		this.#audio = options.audio
		this.#playbackRate = options.playbackRate
		this.#preservePitch = options.preservePitch
		this.duration = options.audio.duration
		this.#setupElement()
		this.#setupGraphConnection()

		this.#signal.addEventListener('abort', () => this.#dispose())
	}

	#setupElement(): void {
		const audio = this.#audio
		const signal = this.#signal

		audio.addEventListener(
			'error',
			() => {
				this.onError?.()
			},
			{ signal },
		)

		audio.addEventListener(
			'ended',
			() => {
				this.onEnded?.()
			},
			{ signal },
		)

		const handleTimeUpdate = throttle(() => {
			this.currentTime = audio.currentTime
		}, CURRENT_TIME_UPDATE_TIMEOUT_MS)

		audio.addEventListener('timeupdate', handleTimeUpdate, { signal })
	}

	#setupGraphConnection(): void {
		const ctx = this.#graph.context
		this.#gainNode = ctx.createGain()
		this.#sourceNode = ctx.createMediaElementSource(this.#audio)
		this.#sourceNode.connect(this.#gainNode)
		this.#gainNode.connect(this.#graph.inputNode)
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

	#dispose(): void {
		cleanupAudioElement(this.#audio)
		this.#gainNode?.disconnect()
		this.#sourceNode?.disconnect()
		this.#gainNode = null
		this.#sourceNode = null
	}

	#updateAudioRate(): void {
		this.#audio.playbackRate = this.#playbackRate
		this.#audio.preservesPitch = this.#preservePitch
	}
}

const cleanupAudioElement = (audio: HTMLAudioElement) => {
	audio.pause()
	const { src } = audio
	if (src) {
		URL.revokeObjectURL(src)
	}

	audio.src = ''
}

const loadAudio = (audio: HTMLAudioElement, signal: AbortSignal) => {
	const { promise, resolve, reject } = Promise.withResolvers<void>()

	const cleanup = () => {
		audio.onloadedmetadata = null
		audio.onerror = null
		signal.removeEventListener('abort', signalHandler)
	}

	const signalHandler = () => {
		cleanup()
		reject(createAbortError())
	}

	signal.addEventListener('abort', signalHandler, { once: true })

	audio.onloadedmetadata = () => {
		cleanup()
		resolve()
	}

	audio.onerror = () => {
		cleanup()

		reject(new Error('Audio element error'))
	}

	return promise
}

export const createHTMLAudioEngine = async (options: AudioEngineOptions) => {
	const { signal } = options
	const audio = new Audio()

	const src = URL.createObjectURL(options.blob)
	audio.src = src
	audio.playbackRate = options.playbackRate
	audio.preservesPitch = options.preservePitch

	try {
		await loadAudio(audio, signal)
	} catch (error) {
		cleanupAudioElement(audio)
		throw error
	}

	return new HTMLAudioEngine({
		audioGraph: options.audioGraph,
		signal,
		audio,
		playbackRate: options.playbackRate,
		preservePitch: options.preservePitch,
	})
}
