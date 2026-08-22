import { mintEntryId, type QueueItem, type UpcomingList } from './queue-entry.ts'

/** `kind`: in the "play next" block (`'next'`) or appended behind it (`'queued'`). */
interface ManualEntry extends QueueItem {
	readonly kind: 'next' | 'queued'
}

/**
 * Pending tracks the user explicitly queued. FIFO.
 * Shuffle does not affect it.
 */
export class ManualQueue implements UpcomingList {
	#entries: readonly ManualEntry[] = $state.raw([])

	get upcomingCount(): number {
		return this.#entries.length
	}

	upcomingAt(i: number): QueueItem | undefined {
		return this.#entries[i]
	}

	upcomingIndexOf(entryId: number): number {
		return this.#entries.findIndex((entry) => entry.entryId === entryId)
	}

	/** The end of the play-next block — a contiguous prefix, so also its length. */
	get #playNextEnd(): number {
		return this.#entries.findLastIndex((entry) => entry.kind === 'next') + 1
	}

	/** `'next'` extends the play-next block; `'last'` appends behind the whole block. */
	enqueue = (trackIds: readonly number[], position: 'next' | 'last'): void => {
		const isNext = position === 'next'
		const at = isNext ? this.#playNextEnd : this.#entries.length
		const kind = isNext ? 'next' : 'queued'

		this.#entries = this.#entries.toSpliced(
			at,
			0,
			...trackIds.map((trackId) => ({ trackId, entryId: mintEntryId(), kind }) as const),
		)
	}

	/**
	 * `kind` is re-derived from where the row lands, keeping the play-next block
	 * contiguous; dropping onto its boundary lands behind it.
	 */
	insertUpcoming = (item: QueueItem, slot: number): void => {
		const at = Math.max(0, Math.min(slot, this.#entries.length))
		const kind = at < this.#playNextEnd ? 'next' : 'queued'

		this.#entries = this.#entries.toSpliced(at, 0, {
			trackId: item.trackId,
			entryId: item.entryId,
			kind,
		})
	}

	removeUpcomingAt = (i: number): void => {
		if (i < 0 || i >= this.#entries.length) {
			return
		}

		this.#entries = this.#entries.toSpliced(i, 1)
	}

	removeEntries = (entryIds: ReadonlySet<number>): void => {
		this.#entries = this.#entries.filter((entry) => !entryIds.has(entry.entryId))
	}

	/** Consumes through row `i`; rows skipped before it are dropped. */
	take = (i: number): QueueItem | undefined => {
		const entry = this.#entries[i]
		if (entry === undefined) {
			return undefined
		}

		this.#entries = this.#entries.slice(i + 1)

		return entry
	}

	removeTracks = (trackIds: ReadonlySet<number>): void => {
		this.#entries = this.#entries.filter((entry) => !trackIds.has(entry.trackId))
	}

	clearUpcoming = (): void => {
		this.#entries = []
	}
}
