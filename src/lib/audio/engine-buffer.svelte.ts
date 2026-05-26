import {
	AudioBufferSink,
	BlobSource,
	canDecodeAudio,
	FLAC,
	Input,
	type InputAudioTrack,
	InputDisposedError,
	PCM_AUDIO_CODECS,
} from 'mediabunny'
import { browser } from '$app/environment'
import { isSafari } from '$lib/helpers/utils/ua.ts'
import { wait } from '$lib/helpers/utils/wait.ts'
import type { AudioGraph } from './audio-graph.ts'
import {
	type AudioEngine,
	type AudioEngineOptions,
	CURRENT_TIME_UPDATE_TIMEOUT_MS,
} from './engine.ts'

const FORMATS = [FLAC]
const LOOK_AHEAD_TIME_SECONDS = 2.0

const isAudioCodecSupported = browser && 'AudioDecoder' in globalThis

export const supportsBufferEngine = (codec: string): boolean | Promise<boolean> => {
	const normalizedCodec = codec.toLowerCase()
	if (!isAudioCodecSupported) {
		return false
	}

	if (PCM_AUDIO_CODECS.includes(codec as 'pcm-s16')) {
		return true
	}

	if (normalizedCodec !== 'flac') {
		return false
	}

	// As of Safari 26.5, it fails to decode FLAC files with error "InternalAudioDecoderCocoa decoding"
	if (isSafari()) {
		return false
	}

	return canDecodeAudio(normalizedCodec as 'flac')
}

/**
 * Plays audio by streaming and decoding via Mediabunny, scheduling decoded
 * AudioBuffers directly on the Web Audio API timeline.
 *
 * Advantages over HTMLAudioEngine:
 * - Sample-accurate scheduling: load(blob, scheduleAt) places the first
 *   sample at exactly the requested AudioContext time, enabling true gapless.
 * - Streaming decode: the file is never fully loaded into memory at once.
 *   Mediabunny reads and decodes lazily as the for-await loop iterates.
 */
export class AudioBufferEngine implements AudioEngine {
	readonly #graph: AudioGraph
	readonly #gainNode: GainNode
	readonly trackId: number

	#input: Input | null = null
	#audioTrack: InputAudioTrack | null = null

	#scheduledSources = new Set<AudioBufferSourceNode>()

	#scheduleBase = 0

	// File time we started from (non-zero after seek).
	#seekOffset = 0

	#schedulingController: AbortController | null = null
	#playbackRate = 1

	#timerId: number | null = null

	currentTime: number = $state(0)
	duration: number = $state(0)

	readonly #signal: AbortSignal
	readonly #blob: Blob

	get endTime(): number {
		return this.#scheduleBase + (this.duration - this.#seekOffset) / this.#playbackRate
	}

	onEnded: (() => void) | null = null
	onError: (() => void) | null = null

	constructor(options: AudioEngineOptions) {
		const { audioGraph } = options

		this.#graph = audioGraph
		this.trackId = options.trackId
		this.duration = options.duration
		this.#signal = options.signal
		this.#blob = options.blob
		this.#playbackRate = options.playbackRate

		this.#gainNode = audioGraph.context.createGain()
		this.#gainNode.connect(audioGraph.inputNode)

		this.#signal.addEventListener('abort', () => this.dispose(), { once: true })
	}

	async load(scheduleAt?: number): Promise<void> {
		const { schedulingSignal } = this.#resetScheduling()

		try {
			const input = new Input({ formats: FORMATS, source: new BlobSource(this.#blob) })
			this.#input = input

			const audioTrack = await input.getPrimaryAudioTrack()
			if (!audioTrack) {
				throw new Error('No audio track found')
			}

			this.#audioTrack = audioTrack

			this.#startFrom(0, scheduleAt, schedulingSignal)
		} catch (error) {
			if (!schedulingSignal.aborted) {
				throw error
			}
		}
	}

	seek(time: number): void {
		this.currentTime = time
		const { schedulingSignal } = this.#resetScheduling()
		this.#startFrom(time, undefined, schedulingSignal)
	}

	setPlaybackRate(rate: number, _preservePitch: boolean): void {
		const elapsed = this.#graph.context.currentTime - this.#scheduleBase
		const currentPosition = this.#seekOffset + Math.max(0, elapsed * this.#playbackRate)
		this.#playbackRate = rate
		const { schedulingSignal } = this.#resetScheduling()
		this.#startFrom(currentPosition, undefined, schedulingSignal)
	}

	play(): Promise<void> {
		return this.#graph.resume()
	}

	pause(): void {
		void this.#graph.suspend()
	}

	dispose(): void {
		this.#resetScheduling()
		this.#input?.dispose()
		this.#input = null
		this.#audioTrack = null
		this.#gainNode.disconnect()
	}

	#startFrom(seekTo: number, scheduleAt: number | undefined, schedulingSignal: AbortSignal) {
		const signal = AbortSignal.any([schedulingSignal, this.#signal])
		invariant(this.#audioTrack, 'Audio track should be loaded before starting playback')

		// Recreating sink on every schedule, so rapid seek/rate-change
		// calls don't corrupt Mediabunny's internal state
		const sink = new AudioBufferSink(this.#audioTrack)

		const ctx = this.#graph.context
		const base = scheduleAt ?? ctx.currentTime
		this.#scheduleBase = base
		this.#seekOffset = seekTo

		this.#startCurrentTimeLoop(signal)
		void this.#scheduleSink(sink, seekTo, base, signal)
	}

	async #scheduleSink(
		sink: AudioBufferSink,
		seekTo: number,
		base: number,
		signal: AbortSignal,
	): Promise<void> {
		let allBuffersPulled = false
		const trackDuration = this.duration

		const handleEnded = () => {
			if (allBuffersPulled && this.#scheduledSources.size === 0 && !signal.aborted) {
				this.#stopCurrentTimeLoop()
				this.onEnded?.()
			}
		}

		try {
			for await (const { buffer, timestamp } of sink.buffers(seekTo)) {
				if (signal.aborted) {
					break
				}

				const ctx = this.#graph.context
				const startAt = base + (timestamp - seekTo) / this.#playbackRate

				// Prevent memory bloat and decode only a few seconds ahead of the current play time.
				while (startAt > ctx.currentTime + LOOK_AHEAD_TIME_SECONDS) {
					if (signal.aborted) {
						break
					}

					// If we are within the final LOOK_AHEAD_TIME_SECONDS window of the track,
					// stop throttling and just let the last few buffers schedule.
					if (trackDuration - timestamp <= LOOK_AHEAD_TIME_SECONDS) {
						break
					}

					await wait(100)
				}

				if (signal.aborted) {
					break
				}

				const source = ctx.createBufferSource()
				source.buffer = buffer
				source.playbackRate.value = this.#playbackRate
				source.connect(this.#gainNode)
				source.start(startAt)

				this.#scheduledSources.add(source)

				source.addEventListener('ended', () => {
					// Remove it so it can be garbage collected
					this.#scheduledSources.delete(source)

					handleEnded()
				})
			}

			allBuffersPulled = true
		} catch (error) {
			if (signal.aborted || error instanceof InputDisposedError) {
				// Do nothing
			} else {
				console.error('Error during audio playback:', error)
				this.onError?.()
			}

			return
		}

		// Guard against when loop completed but NO buffers were ever scheduled
		// (e.g., an empty file or a seek completely past the end of the track).
		handleEnded()
	}

	#startCurrentTimeLoop(signal: AbortSignal): void {
		this.#stopCurrentTimeLoop()

		const tick = () => {
			if (signal.aborted) {
				return
			}

			const elapsed = this.#graph.context.currentTime - this.#scheduleBase
			this.currentTime = this.#seekOffset + Math.max(0, elapsed * this.#playbackRate)
			this.#timerId = window.setTimeout(tick, CURRENT_TIME_UPDATE_TIMEOUT_MS)
		}

		this.#timerId = window.setTimeout(tick, CURRENT_TIME_UPDATE_TIMEOUT_MS)
	}

	#stopCurrentTimeLoop(): void {
		if (this.#timerId !== null) {
			clearTimeout(this.#timerId)
			this.#timerId = null
		}
	}

	/**
	 * Stop and disconnect all scheduled sources, aborting any in-progress load or
	 * playback, and return a new AbortSignal for subsequent operations.
	 */
	#resetScheduling(): { schedulingSignal: AbortSignal } {
		this.#stopCurrentTimeLoop()

		this.#schedulingController?.abort()
		this.#schedulingController = null

		for (const node of this.#scheduledSources) {
			try {
				node.stop()
			} catch {
				// Already stopped.
			}
			try {
				node.disconnect()
			} catch {
				// Already disconnected.
			}
		}
		this.#scheduledSources.clear()

		const controller = new AbortController()
		this.#schedulingController = controller

		return { schedulingSignal: controller.signal }
	}
}
