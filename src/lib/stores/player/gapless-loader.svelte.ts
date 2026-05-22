import { AudioBufferSink, BlobSource, FLAC, Input, InputDisposedError } from 'mediabunny'
import { getTrackFile } from '$lib/helpers/file-access'
import type { FileEntity } from '$lib/helpers/file-system'
import type { TrackData } from '$lib/library/get/value-queries.ts'
import type { EqualizerStore } from './equalizer.svelte.ts'

interface ScheduledSource {
	source: AudioBufferSourceNode
	startAt: number
}

export class GaplessLoader {
	loading: boolean = $state(false)

	readonly #equalizer: EqualizerStore

	#aborted = false
	#input: Input | null = null
	#scheduledSources: ScheduledSource[] = []

	#scheduleBase = 0
	#scheduleSeekOffset = 0

	// Saved so seek() can re-open the same file
	#lastFile: File | null = null

	constructor(equalizer: EqualizerStore) {
		this.#equalizer = equalizer
	}

	get currentTime(): number {
		const ctx = this.#equalizer.audioContext
		const elapsed = ctx.currentTime - this.#scheduleBase
		return this.#scheduleSeekOffset + Math.max(0, elapsed)
	}

	async load(
		directoryId: number,
		fileEntity: FileEntity,
		_track: TrackData,
		scheduleAt?: number,
	): Promise<number> {
		this.abort()
		this.loading = true
		this.#aborted = false

		const fileResult = await getTrackFile(directoryId, fileEntity)
		if (fileResult.status !== 'loaded') {
			this.loading = false
			return 0
		}

		this.#lastFile = fileResult.file

		const ctx = this.#equalizer.audioContext
		const base = scheduleAt ?? ctx.currentTime
		this.#scheduleBase = base
		this.#scheduleSeekOffset = 0

		this.#input = new Input({ formats: [FLAC], source: new BlobSource(fileResult.file) })
		const audioTrack = await this.#input.getPrimaryAudioTrack()

		if (!audioTrack) {
			this.loading = false
			return base
		}

		const sink = new AudioBufferSink(audioTrack)

		this.loading = false

		let lastScheduledEnd = base

		try {
			for await (const { buffer, timestamp } of sink.buffers()) {
				if (this.#aborted) {
					break
				}

				const source = ctx.createBufferSource()
				source.buffer = buffer
				this.#equalizer.connectSource(source)
				source.start(base + timestamp)
				this.#scheduledSources.push({ source, startAt: base + timestamp })

				lastScheduledEnd = base + timestamp + buffer.duration
			}
		} catch (e) {
			if (!(e instanceof InputDisposedError)) {
				throw e
			}
			// InputDisposedError means abort() was called — not an error
		}

		return lastScheduledEnd
	}

	abort(): void {
		this.#aborted = true
		this.#input?.dispose()
		this.#input = null

		const ctx = this.#equalizer.audioContext
		const now = ctx.currentTime
		for (const { source, startAt } of this.#scheduledSources) {
			if (startAt > now) {
				source.stop()
			} else {
				source.stop(now)
			}
		}
		this.#scheduledSources = []
		this.loading = false
	}

	async seek(seekTo: number): Promise<number> {
		this.abort()
		if (!this.#lastFile) {
			return 0
		}

		this.#aborted = false
		const ctx = this.#equalizer.audioContext
		const base = ctx.currentTime
		this.#scheduleBase = base
		this.#scheduleSeekOffset = seekTo

		this.#input = new Input({ formats: [FLAC], source: new BlobSource(this.#lastFile) })
		const audioTrack = await this.#input.getPrimaryAudioTrack()
		if (!audioTrack) {
			return base
		}

		const sink = new AudioBufferSink(audioTrack)
		let lastScheduledEnd = base // ← track this

		try {
			for await (const { buffer, timestamp } of sink.buffers(seekTo)) {
				if (this.#aborted) {
					break
				}

				const source = ctx.createBufferSource()
				source.buffer = buffer
				this.#equalizer.connectSource(source)
				const startAt = base + (timestamp - seekTo)
				source.start(startAt)
				this.#scheduledSources.push({ source, startAt })
				lastScheduledEnd = startAt + buffer.duration // ← update
			}
		} catch (e) {
			if (!(e instanceof InputDisposedError)) {
				throw e
			}
		}

		return lastScheduledEnd // ← return it
	}

	// loadBufferAndPlayItAt(buffer: AudioBuffer, playAt: number): void {
}
