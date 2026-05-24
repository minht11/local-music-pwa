import { AudioBufferSink, BlobSource, FLAC, Input, InputDisposedError } from 'mediabunny'
import { wait } from '$lib/helpers/utils/wait.ts'
import type { AudioGraph } from './audio-graph.ts'
import { type AudioEngine, CURRENT_TIME_UPDATE_TIMEOUT_MS, type LoadResult } from './engine.ts'

const FORMATS = [FLAC]
const LOOK_AHEAD_TIME_SECONDS = 2.0

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
	#sink: AudioBufferSink | null = null

	#scheduledSources = new Set<AudioBufferSourceNode>()

	#scheduleBase = 0

	// File time we started from (non-zero after seek).
	#seekOffset = 0

	#abortController: AbortController | null = null

	#timerId: number | null = null

	loading: boolean = $state(false)
	currentTime: number = $state(0)
	duration: number = $state(0)

	get endTime(): number {
		return this.#scheduleBase + (this.duration - this.#seekOffset)
	}

	onEnded: (() => void) | null = null
	onError: (() => void) | null = null

	constructor(graph: AudioGraph, trackId: number, duration: number) {
		this.#graph = graph
		this.trackId = trackId
		this.duration = duration

		this.#gainNode = graph.context.createGain()
		this.#gainNode.connect(graph.inputNode)
	}

	async load(blob: Blob, scheduleAt?: number): Promise<LoadResult> {
		const { signal } = this.#resetScheduling()

		this.loading = true

		try {
			const input = new Input({ formats: FORMATS, source: new BlobSource(blob) })
			this.#input = input

			const audioTrack = await input.getPrimaryAudioTrack()
			if (!audioTrack) {
				this.loading = false
				return { status: 'failed', reason: 'error' }
			}

			this.#sink = new AudioBufferSink(audioTrack)

			this.loading = false

			return this.#startFrom(0, scheduleAt, signal)
		} catch {
			this.loading = false
			if (!signal.aborted) {
				this.onError?.()
				return { status: 'failed', reason: 'error' }
			}

			return { status: 'aborted' }
		}
	}

	seek(time: number): void {
		this.currentTime = time
		const { signal } = this.#resetScheduling()
		void this.#startFrom(time, undefined, signal)
	}

	play(): Promise<void> {
		return this.#graph.resume()
	}

	pause(): void {
		void this.#graph.suspend()
	}

	abort(): void {
		this.#resetScheduling()
	}

	dispose(): void {
		this.abort()
		this.#input?.dispose()
		this.#input = null
		this.#sink = null
		this.#gainNode.disconnect()
	}

	#startFrom(seekTo: number, scheduleAt: number | undefined, signal: AbortSignal): LoadResult {
		const ctx = this.#graph.context
		const base = scheduleAt ?? ctx.currentTime
		this.#scheduleBase = base
		this.#seekOffset = seekTo
		// TODO. Maybe this should be an invariant instead
		if (!this.#sink) {
			return { status: 'loaded' }
		}

		this.#startCurrentTimeLoop(signal)
		void this.#scheduleSink(this.#sink, seekTo, base, signal)

		return { status: 'loaded' }
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
				const startAt = base + (timestamp - seekTo)

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
			this.currentTime = this.#seekOffset + Math.max(0, elapsed)
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
	#resetScheduling(): { signal: AbortSignal } {
		this.#stopCurrentTimeLoop()

		this.#abortController?.abort()
		this.#abortController = null

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
		this.loading = false

		const controller = new AbortController()
		this.#abortController = controller

		return { signal: controller.signal }
	}
}
