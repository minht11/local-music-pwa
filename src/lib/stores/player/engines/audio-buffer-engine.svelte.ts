import { AudioBufferSink, BlobSource, FLAC, Input } from 'mediabunny'
import type { AudioGraph } from '../audio-graph.ts'
import type { AudioEngine, LoadResult } from './audio-engine.ts'

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

	#scheduledSources = new Set<AudioBufferSourceNode>()
	#lastSource: AudioBufferSourceNode | null = null

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

				this.#scheduledSources.add(source)
				this.#lastSource = source

				// Remove from array when played so the AudioBuffer can be GC'd.
				source.addEventListener('ended', () => {
					this.#scheduledSources.delete(source)
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

		if (signal.aborted) {
			return
		}

		const last = this.#lastSource
		if (!(last && this.#scheduledSources.has(last))) {
			// No buffers were scheduled (empty or fully-past-end seek).
			this.onEnded?.()
			return
		}

		// The last node may have already ended during the scheduling loop.
		last.addEventListener('ended', () => {
			if (!signal.aborted) {
				this.onEnded?.()
			}
		})
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

	/**
	 * Stop and disconnect all scheduled sources, aborting any in-progress load or
	 * playback, and return a new AbortSignal for subsequent operations.
	 */
	#resetScheduling(): { signal: AbortSignal } {
		if (this.#timerId !== null) {
			clearTimeout(this.#timerId)
			this.#timerId = null
		}

		this.#abortController?.abort()
		this.#abortController = null

		for (const node of this.#scheduledSources) {
			try {
				node.stop()
				node.disconnect()
			} catch {
				// Already stopped or never started.
			}
		}
		this.#scheduledSources.clear()
		this.loading = false

		const controller = new AbortController()
		this.#abortController = controller

		return { signal: controller.signal }
	}
}
