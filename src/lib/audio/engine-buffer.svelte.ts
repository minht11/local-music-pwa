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
import { browser } from '$app/env'
import { isAbortError } from '$lib/helpers/utils/errors.ts'
import { isSafari } from '$lib/helpers/utils/ua.ts'
import { wait } from '$lib/helpers/utils/wait.ts'
import type { AudioGraph } from './audio-graph.svelte.ts'
import {
	type AudioEngineImpl,
	type AudioEngineOptions,
	CURRENT_TIME_UPDATE_TIMEOUT_MS,
} from './engine.ts'

const FORMATS = [FLAC]
const LOOK_AHEAD_TIME_SECONDS = 2.0
const BUFFER_RESUME_SECONDS = 1.5
// Seeks this close to the end count as "at the end", absorbing the metadata-vs-
// decoded duration mismatch so no residual sliver plays.
const SEEK_END_THRESHOLD_SECONDS = 0.5

const isAudioCodecSupported = browser && 'AudioDecoder' in globalThis

export const supportsBufferEngine = (codec: string): boolean | Promise<boolean> => {
	const normalizedCodec = codec.toLowerCase()
	if (!isAudioCodecSupported) {
		return false
	}

	if (PCM_AUDIO_CODECS.includes(normalizedCodec as 'pcm-s16')) {
		return canDecodeAudio(normalizedCodec as 'pcm-s16')
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

interface AudioBufferEngineOptions {
	audioGraph: AudioGraph
	duration: number
	input: Input
	audioTrack: InputAudioTrack
	signal: AbortSignal
	scheduleAt?: number
	preservePitch: boolean
	playbackRate: number
}

/**
 * Plays audio by streaming and decoding via Mediabunny, scheduling decoded
 * AudioBuffers directly on the Web Audio API timeline.
 */
export class AudioBufferEngine implements AudioEngineImpl {
	readonly #graph: AudioGraph
	readonly #gainNode: GainNode

	#input: Input
	#audioTrack: InputAudioTrack

	#scheduledSources = new Set<AudioBufferSourceNode>()

	#scheduleBase = 0

	// File time we started from (non-zero after seek).
	#seekOffset = 0

	#schedulingController: AbortController
	readonly #externalSignal: AbortSignal
	/** Combined internal and external abort signals */
	#signal: AbortSignal

	#playbackRate = 1

	#timerId: number | null = null

	// AudioContext time at which the last scheduled buffer ends.
	#lastScheduledEndTime = 0
	// Whether the user intends to play (not paused by user action).
	#wantsToPlay = false

	currentTime = $state(0)
	readonly duration: number
	buffering = $state(false)

	#ended = false
	get ended(): boolean {
		return this.#ended
	}

	get endTime(): number {
		return this.#scheduleBase + (this.duration - this.#seekOffset) / this.#playbackRate
	}

	onEnded: (() => void) | null = null
	onError: (() => void) | null = null

	constructor(options: AudioBufferEngineOptions) {
		const { audioGraph } = options

		this.#graph = audioGraph
		this.duration = options.duration
		this.#externalSignal = options.signal
		this.#input = options.input
		this.#audioTrack = options.audioTrack
		this.#playbackRate = options.playbackRate

		this.#gainNode = audioGraph.context.createGain()
		this.#gainNode.connect(audioGraph.inputNode)
		this.#schedulingController = new AbortController()

		this.#externalSignal.addEventListener('abort', () => this.#dispose())
		this.#signal = AbortSignal.any([this.#schedulingController.signal, this.#externalSignal])

		this.#startFrom(0, options.scheduleAt)
	}

	seek(time: number): void {
		this.currentTime = time
		this.#resetScheduling()

		// Seek to the end while paused: mark ended so the next play() restarts
		// from the start (like the HTML element).
		if (!this.#wantsToPlay && time >= this.duration - SEEK_END_THRESHOLD_SECONDS) {
			this.#ended = true
			return
		}

		this.#startFrom(time)
	}

	setPlaybackRate(rate: number, _preservePitch: boolean): void {
		const elapsed = this.#graph.context.currentTime - this.#scheduleBase
		const currentPosition = this.#seekOffset + Math.max(0, elapsed * this.#playbackRate)
		this.#playbackRate = rate
		this.#resetScheduling()
		this.#startFrom(currentPosition)
	}

	play(): Promise<void> {
		this.#wantsToPlay = true
		if (this.buffering) {
			return Promise.resolve()
		}

		this.#startCurrentTimeLoop(this.#signal)
		return this.#graph.resume()
	}

	pause(): void {
		this.#wantsToPlay = false
		this.#stopCurrentTimeLoop()
		void this.#graph.suspend()
	}

	#dispose(): void {
		this.#resetScheduling()
		this.#input.dispose()
		this.#gainNode.disconnect()
	}

	#startFrom(seekTo: number, scheduleAt?: number) {
		const signal = this.#signal

		// (Re)start clears the ended state.
		this.#ended = false

		// Recreating sink on every schedule, so rapid seek/rate-change
		// calls don't corrupt Mediabunny's internal state
		const sink = new AudioBufferSink(this.#audioTrack)

		const ctx = this.#graph.context
		const base = scheduleAt ?? ctx.currentTime
		this.#scheduleBase = base
		this.#seekOffset = seekTo
		this.#lastScheduledEndTime = base

		// Suspend the graph for non-gapless starts so we don't play silence
		// while waiting for the first decoded buffers to be scheduled.
		if (scheduleAt === undefined) {
			this.buffering = true
			void this.#graph.suspend()
		} else if (this.#wantsToPlay) {
			// Gapless pre-load: start time loop only if the user is already playing.
			this.#startCurrentTimeLoop(signal)
		}

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
				this.#ended = true
				this.#stopCurrentTimeLoop()
				this.onEnded?.()
			}
		}

		const resumeAfterBuffering = () => {
			this.buffering = false
			if (this.#wantsToPlay) {
				this.#startCurrentTimeLoop(signal)
				void this.#graph.resume()
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

					await wait(100, signal)
				}

				if (signal.aborted) {
					break
				}

				const source = ctx.createBufferSource()
				source.buffer = buffer
				source.playbackRate.value = this.#playbackRate
				source.connect(this.#gainNode)
				source.start(startAt)

				this.#lastScheduledEndTime = startAt + buffer.duration / this.#playbackRate

				if (
					this.buffering &&
					this.#lastScheduledEndTime >= ctx.currentTime + BUFFER_RESUME_SECONDS
				) {
					resumeAfterBuffering()
				}

				this.#scheduledSources.add(source)

				source.addEventListener('ended', () => {
					// Remove it so it can be garbage collected
					this.#scheduledSources.delete(source)

					handleEnded()
				})
			}

			allBuffersPulled = true

			// Short track: decode finished before reaching BUFFER_RESUME_SECONDS.
			if (this.buffering && !signal.aborted) {
				resumeAfterBuffering()
			}
		} catch (error) {
			if (signal.aborted || error instanceof InputDisposedError || isAbortError(error)) {
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
	 * Stop and disconnect all scheduled sources,
	 * aborting any in-progress load or playback
	 */
	#resetScheduling() {
		this.#stopCurrentTimeLoop()
		this.buffering = false

		this.#schedulingController.abort()

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
		this.#signal = AbortSignal.any([this.#externalSignal, controller.signal])
	}
}

export const createAudioBufferEngine = async (options: AudioEngineOptions) => {
	const { signal } = options
	const input = new Input({ formats: FORMATS, source: new BlobSource(options.blob) })

	const audioTrack = await input.getPrimaryAudioTrack()
	if (!audioTrack) {
		throw new Error('No audio track found')
	}

	signal.throwIfAborted()

	return new AudioBufferEngine({
		audioGraph: options.audioGraph,
		duration: options.duration,
		input,
		audioTrack,
		signal,
		scheduleAt: options.scheduleAt,
		preservePitch: options.preservePitch,
		playbackRate: options.playbackRate,
	})
}
