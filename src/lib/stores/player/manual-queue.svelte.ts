import { mintEntryId, type QueueItem, type UpcomingList } from './queue-entry.ts'

/**
 * Pending tracks the user explicitly queued. Play-next batches go to the front;
 * add-to-queue batches go to the back. Shuffle does not affect it.
 */
export class ManualQueue implements UpcomingList {
	#entries: readonly QueueItem[] = $state.raw([])

	get upcomingCount(): number {
		return this.#entries.length
	}

	upcomingAt(i: number): QueueItem | undefined {
		return this.#entries[i]
	}

	upcomingIndexOf(entryId: number): number {
		return this.#entries.findIndex((entry) => entry.entryId === entryId)
	}

	enqueue = (trackIds: readonly number[], position: 'next' | 'last'): void => {
		const at = position === 'next' ? 0 : this.#entries.length

		this.#entries = this.#entries.toSpliced(
			at,
			0,
			...trackIds.map((trackId) => ({ trackId, entryId: mintEntryId() })),
		)
	}

	insertUpcoming = (item: QueueItem, slot: number): void => {
		const at = Math.max(0, Math.min(slot, this.#entries.length))

		this.#entries = this.#entries.toSpliced(at, 0, {
			trackId: item.trackId,
			entryId: item.entryId,
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
