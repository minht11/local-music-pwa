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
	#scheduledSources = new Set<ScheduledSource>()

	#scheduleBase = 0
	#scheduleSeekOffset = 0

	// Saved so seek() can re-open the same file
	#lastFile: File | null = null

	onEnded: (() => void) | null = null

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

		try {
			return await this.#streamBuffer(fileResult.file, 0, base)
		} finally {
			this.loading = false
		}
	}

	abort(): void {
		this.#aborted = true
		this.#input?.dispose()
		this.#input = null

		const ctx = this.#equalizer.audioContext
		const now = ctx.currentTime
		for (const { source, startAt } of this.#scheduledSources) {
			source.onended = null
			if (startAt > now) {
				source.stop()
			} else {
				source.stop(now)
			}
		}
		this.#scheduledSources.clear()
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

		try {
			return await this.#streamBuffer(this.#lastFile, seekTo, base)
		} finally {
			this.loading = false
		}
	}

	async #streamBuffer(audioBlob: Blob, seekTo: number, scheduleAt?: number): Promise<number> {
		this.#input = new Input({ formats: [FLAC], source: new BlobSource(audioBlob) })

		const audioTrack = await this.#input.getPrimaryAudioTrack()
		if (!audioTrack) {
			return scheduleAt ?? this.#equalizer.audioContext.currentTime
		}
		const ctx = this.#equalizer.audioContext
		const base = scheduleAt ?? ctx.currentTime

		let lastScheduledEnd = base
		let lastEntry: ScheduledSource | null = null

		const sink = new AudioBufferSink(audioTrack)

		try {
			for await (const { buffer, timestamp } of sink.buffers(seekTo)) {
				if (this.#aborted) {
					break
				}

				const source = ctx.createBufferSource()
				source.buffer = buffer
				this.#equalizer.connectSource(source)

				const startAt = base + (timestamp - seekTo)

				const entry: ScheduledSource = { source, startAt }
				this.#scheduledSources.add(entry)
				source.onended = () => {
					this.#scheduledSources.delete(entry)
				}
				source.start(startAt)

				lastEntry = entry
				lastScheduledEnd = startAt + buffer.duration
			}
		} catch (e) {
			if (!(e instanceof InputDisposedError)) {
				throw e
			}
		}

		if (lastEntry && !this.#aborted) {
			lastEntry.source.onended = () => {
				this.#scheduledSources.delete(lastEntry)
				this.onEnded?.()
			}
		}

		return lastScheduledEnd
	}
}
