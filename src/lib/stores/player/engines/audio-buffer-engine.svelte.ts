import { AudioBufferSink, BlobSource, FLAC, Input, type InputAudioTrack } from 'mediabunny'
import type { AudioGraph } from '../audio-graph.ts'
import type { AudioEngine, LoadResult } from './audio-engine.ts'

interface ScheduledSource {
	node: AudioBufferSourceNode
	startAt: number
	endAt: number
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
 *
 * Memory note: scheduled AudioBufferSourceNodes hold references to their
 * AudioBuffers. Each node's onended removes it from #scheduledSources so
 * played buffers can be GC'd as playback progresses.
 */
export class AudioBufferEngine implements AudioEngine {
	readonly #graph: AudioGraph
	readonly #gainNode: GainNode
	readonly trackId: number

	#input: Input | null = null
	#sink: AudioBufferSink | null = null

	#scheduledSources: ScheduledSource[] = []

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
		this.#cancelScheduling()

		const controller = new AbortController()
		this.#abortController = controller
		const { signal } = controller

		this.loading = true

		try {
			const input = new Input({ formats: [FLAC], source: new BlobSource(blob) })
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

			return { status: 'failed', reason: 'superseded' }
		}
	}

	seek(time: number): void {
		this.#cancelScheduling()
		const controller = new AbortController()
		this.#abortController = controller
		void this.#startFrom(time, undefined, controller.signal)
	}

	play(): Promise<void> {
		return this.#graph.resume()
	}

	pause(): void {
		void this.#graph.suspend()
	}

	abort(): void {
		this.#cancelScheduling()
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
		invariant(this.#sink, 'AudioBufferSink should be initialized before starting playback')

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
		try {
			for await (const { buffer, timestamp } of sink.buffers(seekTo)) {
				if (signal.aborted) {
					break
				}

				const ctx = this.#graph.context
				const source = ctx.createBufferSource()
				source.buffer = buffer
				source.connect(this.#gainNode)

				const startAt = base + (timestamp - seekTo)
				source.start(startAt)

				const entry: ScheduledSource = {
					node: source,
					startAt,
					endAt: startAt + buffer.duration,
				}
				this.#scheduledSources.push(entry)

				// Remove from array when played so the AudioBuffer can be GC'd.
				source.addEventListener('ended', () => {
					const idx = this.#scheduledSources.indexOf(entry)
					if (idx !== -1) {
						this.#scheduledSources.splice(idx, 1)
					}
				})
			}
		} catch {
			// Thrown by input.dispose() (abort) or a genuine decode error.
			// If generation changed, it was an abort — not an error.
			if (!signal.aborted) {
				this.onError?.()
			}
			return
		}

		// Scheduling complete. Wire onEnded to the last scheduled node.
		if (signal.aborted) {
			return
		}

		const last = this.#scheduledSources.at(-1)
		if (!last) {
			// No buffers were scheduled (empty or fully-past-end seek).
			this.onEnded?.()
			return
		}

		// Guard against the race where the last node finished playing before
		// we reached this point (e.g. seeking to 1 second before the end).
		const now = this.#graph.context.currentTime
		if (now >= last.endAt) {
			if (!signal.aborted) {
				this.onEnded?.()
			}
		} else {
			last.node.addEventListener('ended', () => {
				if (!signal.aborted) {
					this.onEnded?.()
				}
			})
		}
	}

	#startCurrentTimeLoop(signal: AbortSignal): void {
		if (this.#timerId !== null) {
			clearTimeout(this.#timerId)
		}

		const tick = () => {
			if (signal.aborted) {
				return
			}

			const elapsed = this.#graph.context.currentTime - this.#scheduleBase
			this.currentTime = this.#seekOffset + Math.max(0, elapsed)
			this.#timerId = window.setTimeout(tick, 250)
		}

		this.#timerId = window.setTimeout(tick, 250)
	}

	#cancelScheduling(): void {
		if (this.#timerId !== null) {
			clearTimeout(this.#timerId)
			this.#timerId = null
		}

		this.#abortController?.abort()
		this.#abortController = null

		for (const { node } of this.#scheduledSources) {
			try {
				node.stop()
				node.disconnect()
			} catch {
				// Already stopped or never started.
			}
		}
		this.#scheduledSources = []
		this.loading = false
	}
}
