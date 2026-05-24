import { AudioBufferSink, BlobSource, FLAC, Input } from 'mediabunny'
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

	#blob: Blob | null = null

	#scheduledSources: ScheduledSource[] = []

	#scheduleBase = 0

	// File time we started from (non-zero after seek).
	#seekOffset = 0

	// Generation counter: incremented on abort/seek to invalidate
	// in-progress scheduling loops and stale onended callbacks.
	#generation = 0

	#rafId = 0

	loading: boolean = $state(false)
	currentTime: number = $state(0)
	duration: number = $state(0)

	onEnded: (() => void) | null = null
	onError: (() => void) | null = null

	constructor(graph: AudioGraph, trackId: number, duration: number) {
		this.#graph = graph
		this.trackId = trackId
		this.duration = duration

		this.#gainNode = graph.context.createGain()
		this.#gainNode.connect(graph.inputNode)
	}

	load(blob: Blob, scheduleAt?: number): Promise<LoadResult> {
		console.log('Load', blob)
		this.#stopPlayback()
		this.#blob = blob
		this.#aborted = false

		return this.#loadFrom(blob, 0, scheduleAt)
	}

	seek(time: number): void {
		if (!this.#blob) {
			return
		}
		this.#stopPlayback()
		this.#aborted = false
		this.currentTime = time
		// Fire and forget — seek result isn't awaited by the caller.
		void this.#loadFrom(this.#blob, time, undefined)
	}

	play(): Promise<void> {
		return this.#graph.resume()
	}

	pause(): void {
		void this.#graph.suspend()
	}

	abort(): void {
		this.#aborted = true
		this.#stopPlayback()
	}

	dispose(): void {
		this.abort()
		this.#gainNode.disconnect()
	}

	// ─── Private ──────────────────────────────────────────────────────────────

	// Tracks whether the latest operation has been aborted.
	// Separate from #generation so we can distinguish abort vs supersede.
	#aborted = false

	async #loadFrom(blob: Blob, seekTo: number, scheduleAt?: number): Promise<LoadResult> {
		this.#generation += 1
		const gen = this.#generation

		this.loading = true
		this.#seekOffset = seekTo

		const ctx = this.#graph.context
		const base = scheduleAt ?? ctx.currentTime
		this.#scheduleBase = base

		try {
			const input = new Input({ formats: [FLAC], source: new BlobSource(blob) })
			this.#input = input

			const audioTrack = await input.getPrimaryAudioTrack()
			if (!audioTrack) {
				this.loading = false
				return { status: 'failed', reason: 'error' }
			}

			if (this.#generation !== gen) {
				input.dispose()
				return { status: 'failed', reason: 'superseded' }
			}

			// getDurationFromMetadata() reads only file headers — fast.
			// FLAC STREAMINFO always contains totalSamples so this never falls back
			// to the expensive computeDuration() scan in practice.
			this.loading = false

			if (this.#generation !== gen) {
				input.dispose()
				return { status: 'failed', reason: 'superseded' }
			}

			// Start the rAF loop and scheduling in the background.
			this.#startCurrentTimeLoop(gen)
			void this.#scheduleSink(audioTrack, seekTo, base, gen)
			console.log(
				`Scheduled AudioBufferEngine with seekTo=${seekTo}, scheduleAt=${scheduleAt}`,
				audioTrack,
			)

			// endTime is sample-accurate for gapless scheduling.
			return { status: 'loaded', endTime: base + (this.duration - seekTo) }
		} catch {
			this.loading = false
			if (this.#generation === gen) {
				this.onError?.()
				return { status: 'failed', reason: 'error' }
			}
			return { status: 'failed', reason: 'superseded' }
		}
	}

	async #scheduleSink(
		audioTrack: Awaited<ReturnType<Input['getPrimaryAudioTrack']>>,
		seekTo: number,
		base: number,
		gen: number,
	): Promise<void> {
		const sink = new AudioBufferSink(audioTrack!)

		try {
			for await (const { buffer, timestamp } of sink.buffers(seekTo)) {
				if (this.#generation !== gen) {
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
			if (this.#generation === gen) {
				this.onError?.()
			}
			return
		}

		// Scheduling complete. Wire onEnded to the last scheduled node.
		if (this.#generation !== gen) {
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
			if (this.#generation === gen) {
				this.onEnded?.()
			}
		} else {
			last.node.addEventListener('ended', () => {
				if (this.#generation === gen) {
					this.onEnded?.()
				}
			})
		}
	}

	#startCurrentTimeLoop(gen: number): void {
		cancelAnimationFrame(this.#rafId)

		let _tick = 0
		const tick = () => {
			if (this.#generation !== gen) {
				return
			}

			if (++_tick % 200 === 0) {
				console.log('[AudioBufferEngine] rAF', {
					gen,
					currentGen: this.#generation,
					ctxTime: this.#graph.context.currentTime,
					base: this.#scheduleBase,
					currentTime: this.currentTime,
					ctxState: this.#graph.context.state,
				})
			}

			const elapsed = this.#graph.context.currentTime - this.#scheduleBase
			this.currentTime = this.#seekOffset + Math.max(0, elapsed)

			this.#rafId = requestAnimationFrame(tick)
		}

		this.#rafId = requestAnimationFrame(tick)
	}

	#stopPlayback(): void {
		cancelAnimationFrame(this.#rafId)
		this.#generation += 1

		// Disposing the Input causes the for-await sink loop to throw,
		// cleanly stopping the scheduling goroutine.
		this.#input?.dispose()
		this.#input = null

		// const now = this.#graph.initialized ? this.#graph.context.currentTime : 0
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
