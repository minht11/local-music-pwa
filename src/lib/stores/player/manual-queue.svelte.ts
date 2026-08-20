import { mintEntryId, type QueueItem, type UpcomingList } from './queue-entry.ts'

/** `kind`: in the "play next" block (`'next'`) or appended behind it (`'queued'`). */
interface ManualEntry extends QueueItem {
	readonly kind: 'next' | 'queued'
}

/**
 * The tracks the user explicitly queued. FIFO.
 * Shuffle does not affect it.
 */
export class ManualQueue implements UpcomingList {
	#entries: readonly ManualEntry[] = $state.raw([])
	#activeDetour: ManualEntry | undefined = $state(undefined)

	/** The active manual row detouring from the source cursor, if any. */
	get activeDetour(): QueueItem | undefined {
		return this.#activeDetour
	}

	get upcomingCount(): number {
		return this.#entries.length
	}

	get isEmpty(): boolean {
		return this.#activeDetour === undefined && this.#entries.length === 0
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

	/** Consumes through row `i`: it starts the detour and the rows it skipped are dropped. */
	take = (i: number): QueueItem | undefined => {
		const entry = this.#entries[i]
		if (entry === undefined) {
			return undefined
		}

		this.#entries = this.#entries.slice(i + 1)
		this.#activeDetour = entry

		return entry
	}

	/** Ends the active manual detour. */
	endDetour = (): void => {
		this.#activeDetour = undefined
	}

	removeAll = (trackId: number): void => {
		this.#entries = this.#entries.filter((entry) => entry.trackId !== trackId)

		if (this.#activeDetour?.trackId === trackId) {
			this.#activeDetour = undefined
		}
	}

	clearUpcoming = (): void => {
		this.#entries = []
	}
}
