import { toShuffledArray } from '$lib/helpers/utils/array.ts'
import { mintEntryId, type QueueItem, type UpcomingList } from './queue-entry.ts'

export interface QueueOrigin {
	type: 'album' | 'artist' | 'playlist' | 'tracks'
	name: string
}

interface SourceEntry extends QueueItem {
	/** Original rank used to restore correct order when shuffle is off. */
	readonly canonical: number
}

/** Source playback order, split by the gap immediately before the next source row. */
export class SourceQueue implements UpcomingList {
	shuffle = $state(false)
	origin: QueueOrigin | null = $state(null)

	#entries: readonly SourceEntry[] = $state.raw([])
	#nextIndex = $state(0)

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
		const absolute = this.#indexOfEntry(entryId)

		return absolute >= this.#nextIndex ? absolute - this.#nextIndex : -1
	}

	setItems = (
		ids: readonly number[],
		start: number | 'shuffle',
		origin: QueueOrigin | null,
	): QueueItem | undefined => {
		const entries: SourceEntry[] = ids.map((trackId, canonical) => ({
			entryId: mintEntryId(),
			trackId,
			canonical,
		}))
		const shuffle = start === 'shuffle'
		const selectedIndex = Math.max(-1, Math.min(shuffle ? 0 : start, entries.length - 1))

		this.origin = entries.length === 0 ? null : origin
		this.shuffle = shuffle
		this.#entries = shuffle ? toShuffledArray(entries) : entries
		this.#nextIndex = selectedIndex + 1

		return this.#entries[selectedIndex]
	}

	advance = (loop: boolean): QueueItem | undefined => this.#land(this.#stepped(1, loop))

	peekNext = (loop: boolean): number | undefined =>
		this.#entries[this.#stepped(1, loop) ?? -1]?.trackId

	canStepBack = (loop: boolean): boolean => this.#stepped(-1, loop) !== undefined

	stepBack = (loop: boolean): QueueItem | undefined => this.#land(this.#stepped(-1, loop))

	jumpToEntryId = (entryId: number): QueueItem | undefined =>
		this.#land(this.#indexOfEntry(entryId))

	jumpToTrackId = (id: number): QueueItem | undefined =>
		this.#land(this.#entries.findIndex((entry) => entry.trackId === id))

	/** On: pins the row before the gap to the front. Off: restores canonical order. */
	toggleShuffle = (): void => {
		this.shuffle = !this.shuffle

		if (this.shuffle) {
			this.#apply((entries) => {
				const previous = entries[this.#nextIndex - 1]
				if (previous === undefined) {
					return toShuffledArray(entries)
				}

				return [previous, ...toShuffledArray(entries.filter((entry) => entry !== previous))]
			})
		} else {
			this.#apply((entries) => entries.toSorted((a, b) => a.canonical - b.canonical))
		}
	}

	removeUpcomingAt = (i: number): void => {
		const absolute = this.#nextIndex + i
		if (i < 0 || absolute >= this.#entries.length) {
			return
		}

		this.#apply((entries) => entries.toSpliced(absolute, 1))
	}

	moveUpcoming = (from: number, to: number): void => {
		const absoluteFrom = this.#nextIndex + from
		if (from < 0 || absoluteFrom >= this.#entries.length) {
			return
		}

		const item = this.#entries[absoluteFrom]
		invariant(item !== undefined)
		const at = this.#nextIndex + Math.max(0, Math.min(to, this.upcomingCount - 1))

		this.#applyCommitted((entries) => entries.toSpliced(absoluteFrom, 1).toSpliced(at, 0, item))
	}

	insertUpcoming = (item: QueueItem, slot: number): void => {
		const at = this.#nextIndex + Math.max(0, Math.min(slot, this.upcomingCount))

		this.#applyCommitted((entries) =>
			entries.toSpliced(at, 0, { entryId: item.entryId, trackId: item.trackId }),
		)
	}

	clearUpcoming = (): void => {
		this.#apply((entries) => entries.slice(0, this.#nextIndex))
	}

	removeTracks = (trackIds: ReadonlySet<number>, preserveGap: boolean): void => {
		this.#apply(
			(entries) => entries.filter((entry) => !trackIds.has(entry.trackId)),
			preserveGap,
		)
	}

	/** Never removes the row immediately before the next gap. */
	removeEntries = (entryIds: ReadonlySet<number>): void => {
		const previousEntryId = this.entryBeforeNext?.entryId
		this.#apply((entries) =>
			entries.filter(
				(entry) => entry.entryId === previousEntryId || !entryIds.has(entry.entryId),
			),
		)
	}

	#apply = (
		transform: (entries: readonly SourceEntry[]) => SourceEntry[],
		preserveGap = false,
	): void => {
		const next = transform(this.#entries)
		this.#nextIndex = this.#resolveGapAfterMutation(next, preserveGap)
		this.#entries = next
		if (next.length === 0) {
			this.origin = null
		}
	}

	#resolveGapAfterMutation(next: readonly SourceEntry[], preserveGap: boolean): number {
		const previousEntryId = this.entryBeforeNext?.entryId
		if (previousEntryId === undefined) {
			return 0
		}

		const previousIndex = next.findIndex((entry) => entry.entryId === previousEntryId)
		if (previousIndex !== -1) {
			return previousIndex + 1
		}
		if (!preserveGap) {
			return 0
		}

		const survivingEntryIds = new Set(next.map((entry) => entry.entryId))
		const predecessor = this.#entries
			.slice(0, this.#nextIndex - 1)
			.findLast((entry) => survivingEntryIds.has(entry.entryId))

		return predecessor === undefined
			? 0
			: next.findIndex((entry) => entry.entryId === predecessor.entryId) + 1
	}

	#applyCommitted = (transform: (entries: readonly QueueItem[]) => QueueItem[]): void => {
		this.shuffle = false
		this.#apply((entries) =>
			transform(entries).map(({ entryId, trackId }, canonical) => ({
				entryId,
				trackId,
				canonical,
			})),
		)
	}

	#indexOfEntry = (entryId: number): number =>
		this.#entries.findIndex((entry) => entry.entryId === entryId)

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
