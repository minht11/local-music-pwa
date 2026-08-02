import { mintEntryId, type QueueItem } from './queue-entry.ts'

/** `kind`: in the "play next" block (`'next'`) or appended behind it (`'queued'`). */
interface ManualEntry extends QueueItem {
	readonly kind: 'next' | 'queued'
}

/**
 * The tracks the user explicitly queued. FIFO.
 * Shuffle does not affect it.
 */
export class ManualQueue {
	#entries: readonly ManualEntry[] = $state.raw([])
	#current: ManualEntry | undefined = $state(undefined)

	get current(): QueueItem | undefined {
		return this.#current
	}

	get upcomingCount(): number {
		return this.#entries.length
	}

	get isEmpty(): boolean {
		return this.#current === undefined && this.#entries.length === 0
	}

	upcomingAt(i: number): QueueItem | undefined {
		return this.#entries[i]
	}

	upcomingIndexOf(entryId: number): number {
		return this.#entries.findIndex((entry) => entry.entryId === entryId)
	}

	/**
	 * The end of the play-next block, and the single definition of that boundary:
	 * `enqueue('next')` chains onto it, and an inserted row joins the block only by
	 * landing strictly before it.
	 */
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
	 * Keeps the item's entry id, so a row carried over from the source layer holds
	 * its identity. Dropping onto the block boundary appends behind it, where
	 * `enqueue('next')` would extend it.
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

	/** Carries `kind` along, so a reorder never changes which rows form the block. */
	moveUpcomingItem = (from: number, to: number): void => {
		const { length } = this.#entries
		if (from < 0 || from >= length || to < 0 || to >= length) {
			return
		}

		const moved = this.#entries[from]
		invariant(moved !== undefined)
		this.#entries = this.#entries.toSpliced(from, 1).toSpliced(to, 0, moved)
	}

	removeEntries = (entryIds: ReadonlySet<number>): void => {
		this.#entries = this.#entries.filter((entry) => !entryIds.has(entry.entryId))
	}

	/** Consumes through row `i`: it becomes current and the rows it skipped are dropped. */
	take = (i: number): QueueItem | undefined => {
		const entry = this.#entries[i]
		if (entry === undefined) {
			return undefined
		}

		this.#entries = this.#entries.slice(i + 1)
		this.#current = entry

		return entry
	}

	/** Ends the detour: whatever was playing from here no longer is. */
	releaseCurrent = (): void => {
		this.#current = undefined
	}

	removeAll = (trackId: number): void => {
		this.#entries = this.#entries.filter((entry) => entry.trackId !== trackId)

		if (this.#current?.trackId === trackId) {
			this.#current = undefined
		}
	}

	clearUpcoming = (): void => {
		this.#entries = []
	}

	clear = (): void => {
		this.#entries = []
		this.#current = undefined
	}
}
