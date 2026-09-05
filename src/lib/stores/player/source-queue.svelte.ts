import { toShuffledArray } from '$lib/helpers/utils/array.ts'
import { mintEntryId, type QueueItem, type UpcomingList } from './queue-entry.ts'

export interface QueueOrigin {
	type: 'album' | 'artist' | 'playlist' | 'tracks'
	name: string
}

/** Source playback order, split by the gap immediately before the next source row. */
export class SourceQueue implements UpcomingList {
	origin: QueueOrigin | null = $state(null)

	#entries: readonly QueueItem[] = $state.raw([])
	/** Retains the order at shuffle enablement; removed rows stay here until shuffle is disabled. */
	#orderBeforeShuffle: readonly QueueItem[] | null = $state.raw(null)
	#nextIndex = $state(0)

	get shuffle(): boolean {
		return this.#orderBeforeShuffle !== null
	}

	set shuffle(value: boolean) {
		if (value === this.shuffle) {
			return
		}
		const previous = this.entryBeforeNext

		if (value) {
			this.#orderBeforeShuffle = this.#entries
			if (previous === undefined) {
				this.#replace(toShuffledArray(this.#entries), 0)

				return
			}

			this.#replace(
				[previous, ...toShuffledArray(this.#entries, (entry) => entry !== previous)],
				1,
			)

			return
		}

		const snapshot = this.#orderBeforeShuffle
		invariant(snapshot !== null)
		let entries = snapshot
		if (snapshot.length !== this.#entries.length) {
			const liveEntryIds = new Set(this.#entries.map((entry) => entry.entryId))
			entries = snapshot.filter((entry) => liveEntryIds.has(entry.entryId))
		}
		const previousIndex =
			previous === undefined
				? -1
				: entries.findIndex((entry) => entry.entryId === previous.entryId)
		this.#orderBeforeShuffle = null
		this.#replace(entries, previousIndex + 1)
	}

	/** The source row immediately before the next gap, used to resume after a manual row. */
	get entryBeforeNext(): QueueItem | undefined {
		return this.#entries[this.#nextIndex - 1]
	}

	get upcomingCount(): number {
		return this.#entries.length - this.#nextIndex
	}

	upcomingAt(i: number): QueueItem | undefined {
		if (i < 0) {
			return undefined
		}

		return this.#entries[this.#nextIndex + i]
	}

	upcomingIndexOf(entryId: number): number {
		for (let index = this.#nextIndex; index < this.#entries.length; index += 1) {
			if (this.#entries[index]?.entryId === entryId) {
				return index - this.#nextIndex
			}
		}

		return -1
	}

	setItems = (
		ids: readonly number[],
		start: number | 'shuffle',
		origin: QueueOrigin | null,
	): QueueItem | undefined => {
		const entries: QueueItem[] = ids.map((trackId) => ({
			entryId: mintEntryId(),
			trackId,
		}))
		const shuffle = start === 'shuffle'
		const selectedIndex = Math.max(-1, Math.min(shuffle ? 0 : start, entries.length - 1))

		this.#orderBeforeShuffle = shuffle ? entries : null
		this.#replace(shuffle ? toShuffledArray(entries) : entries, selectedIndex + 1, origin)

		return this.#entries[selectedIndex]
	}

	advance = (loop: boolean): QueueItem | undefined => this.#land(this.#stepped(1, loop))

	peekNext = (loop: boolean): number | undefined =>
		this.#entries[this.#stepped(1, loop) ?? -1]?.trackId

	canStepBack = (loop: boolean): boolean => this.#stepped(-1, loop) !== undefined

	stepBack = (loop: boolean): QueueItem | undefined => this.#land(this.#stepped(-1, loop))

	jumpToEntryId = (entryId: number): QueueItem | undefined =>
		this.#land(this.#entries.findIndex((entry) => entry.entryId === entryId))

	jumpToTrackId = (id: number): QueueItem | undefined =>
		this.#land(this.#entries.findIndex((entry) => entry.trackId === id))

	/** On: saves the current order and pins the row before the gap to the front. */
	toggleShuffle = (): void => {
		this.shuffle = !this.shuffle
	}

	removeUpcomingAt = (i: number): void => {
		if (i < 0 || i >= this.upcomingCount) {
			return
		}

		this.#replace(this.#entries.toSpliced(this.#nextIndex + i, 1), this.#nextIndex)
	}

	moveUpcoming = (from: number, to: number): void => {
		if (from < 0 || from >= this.upcomingCount) {
			return
		}

		const at = Math.max(0, Math.min(to, this.upcomingCount - 1))
		const entries = [...this.#entries]
		const [item] = entries.splice(this.#nextIndex + from, 1)
		invariant(item !== undefined)
		entries.splice(this.#nextIndex + at, 0, item)
		this.#commitVisibleOrder(entries, this.#nextIndex)
	}

	insertUpcoming = (item: QueueItem, slot: number): void => {
		const at = Math.max(0, Math.min(slot, this.upcomingCount))
		const entries: QueueItem[] = [...this.#entries]
		entries.splice(this.#nextIndex + at, 0, item)
		this.#commitVisibleOrder(entries, this.#nextIndex)
	}

	clearUpcoming = (): void => {
		this.#replace(this.#entries.slice(0, this.#nextIndex), this.#nextIndex)
	}

	removeTracks = (trackIds: ReadonlySet<number>): void => {
		this.#removeWhere((entry) => trackIds.has(entry.trackId))
	}

	/** Never removes the row immediately before the next gap. */
	removeEntries = (entryIds: ReadonlySet<number>): void => {
		const previousEntryId = this.entryBeforeNext?.entryId
		this.#removeWhere(
			(entry) => entry.entryId !== previousEntryId && entryIds.has(entry.entryId),
		)
	}

	makeAllUpcoming = (): void => {
		this.#replace(this.#entries, 0)
	}

	#commitVisibleOrder = (entries: readonly QueueItem[], nextIndex: number): void => {
		this.#orderBeforeShuffle = null
		this.#replace(entries, nextIndex)
	}

	#removeWhere = (shouldRemove: (entry: QueueItem) => boolean): void => {
		let removedBeforeNext = 0
		const entries = this.#entries.filter((entry, index) => {
			if (!shouldRemove(entry)) {
				return true
			}
			if (index < this.#nextIndex) {
				removedBeforeNext += 1
			}

			return false
		})
		this.#replace(entries, this.#nextIndex - removedBeforeNext)
	}

	#replace = (
		entries: readonly QueueItem[],
		nextIndex: number,
		origin: QueueOrigin | null = this.origin,
	): void => {
		this.#entries = entries
		this.#nextIndex = Math.max(0, Math.min(nextIndex, entries.length))
		this.origin = entries.length === 0 ? null : origin
	}

	#land(index: number | undefined): QueueItem | undefined {
		if (index === undefined || index < 0 || index >= this.#entries.length) {
			return undefined
		}

		this.#nextIndex = index + 1

		return this.#entries[index]
	}

	#stepped(delta: 1 | -1, loop: boolean): number | undefined {
		const index = this.#nextIndex - 1 + delta
		if (index >= 0 && index < this.#entries.length) {
			return index
		}
		if (!loop || this.#entries.length === 0) {
			return undefined
		}

		return index < 0 ? this.#entries.length - 1 : 0
	}
}
