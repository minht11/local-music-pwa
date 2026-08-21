import { toShuffledArray } from '$lib/helpers/utils/array.ts'
import { mintEntryId, type QueueItem, type UpcomingList } from './queue-entry.ts'

export interface QueueOrigin {
	type: 'album' | 'artist' | 'playlist' | 'tracks'
	name: string
}

interface SourceEntry extends QueueItem {
	/** Original rank used to restore correct order when shuffle is off */
	readonly canonical: number
}

/** Source playback order plus its cursor, which becomes a resume anchor during a manual detour. */
export class SourceQueue implements UpcomingList {
	shuffle = $state(false)
	origin: QueueOrigin | null = $state(null)

	// Every edit must go through #apply() so correct cursor is preserved
	#entries: readonly SourceEntry[] = $state.raw([])
	// During a manual detour this is the return point: source playback resumes at
	// the following track. Absolute positions are private to this class — every
	// public read addresses rows by entry id, track id, or upcoming-relative index.
	#index = $state(-1)

	get length(): number {
		return this.#entries.length
	}

	/**
	 * The source cursor. During a manual detour this serves as the return anchor,
	 * not the externally active row.
	 */
	get cursorEntry(): QueueItem | undefined {
		return this.#entries[this.#index]
	}

	get upcomingCount(): number {
		return Math.max(0, this.#entries.length - this.#index - 1)
	}

	/** Upcoming row `i` (0 = first track after the cursor). */
	upcomingAt(i: number): QueueItem | undefined {
		if (i < 0) {
			return undefined
		}

		return this.#entries[this.#index + 1 + i]
	}

	/** -1 when absent or at/before the cursor; only upcoming rows can move. */
	upcomingIndexOf(entryId: number): number {
		const absolute = this.#indexOfEntry(entryId)

		return absolute > this.#index ? absolute - this.#index - 1 : -1
	}

	setItems = (
		ids: readonly number[],
		start: number | 'shuffle',
		origin: QueueOrigin | null,
	): void => {
		const entries: SourceEntry[] = ids.map((trackId, index) => ({
			entryId: mintEntryId(),
			trackId,
			canonical: index,
		}))

		const shuffle = start === 'shuffle'
		const startIndex = shuffle ? 0 : start

		this.origin = entries.length === 0 ? null : origin
		this.shuffle = shuffle
		this.#entries = shuffle ? toShuffledArray(entries) : entries
		// A negative start means "no source cursor, everything upcoming"; the clamp
		// keeps `-1 <= index < length`.
		this.#index = Math.max(-1, Math.min(startIndex, entries.length - 1))
	}

	advance = (loop: boolean): boolean => this.#jumpToIndex(this.#stepped(1, loop))

	peekNext = (loop: boolean): number | undefined => {
		const next = this.#stepped(1, loop)

		return next === undefined ? undefined : this.#entries[next]?.trackId
	}

	stepBack = (loop: boolean): boolean => this.#jumpToIndex(this.#stepped(-1, loop))

	/** Backward jumps are legal. */
	jumpToEntryId = (entryId: number): boolean => this.#jumpToIndex(this.#indexOfEntry(entryId))

	/** The first row with track id `id`; backward jumps are legal. */
	jumpToTrackId = (id: number): boolean =>
		this.#jumpToIndex(this.#entries.findIndex((entry) => entry.trackId === id))

	/** On: pins the cursor row to the front. Off: restores canonical order. */
	toggleShuffle = (): void => {
		this.shuffle = !this.shuffle

		if (this.shuffle) {
			this.#apply((entries) => {
				const cursorEntry = entries[this.#index]
				if (cursorEntry === undefined) {
					return toShuffledArray(entries)
				}

				return [
					cursorEntry,
					...toShuffledArray(entries.filter((entry) => entry !== cursorEntry)),
				]
			})
		} else {
			this.#apply((entries) => entries.toSorted((a, b) => a.canonical - b.canonical))
		}
	}

	removeUpcomingAt = (i: number): void => {
		const absolute = this.#index + 1 + i
		if (i < 0 || absolute >= this.#entries.length) {
			return
		}

		this.#apply((entries) => entries.toSpliced(absolute, 1))
	}

	/** Reorders upcoming rows in one mutation and commits their visible order. */
	moveUpcoming = (from: number, to: number): void => {
		const absoluteFrom = this.#index + 1 + from
		if (from < 0 || absoluteFrom >= this.#entries.length) {
			return
		}

		const item = this.#entries[absoluteFrom]
		invariant(item !== undefined)
		const at = this.#index + 1 + Math.max(0, Math.min(to, this.upcomingCount - 1))

		this.#applyCommitted((entries) => entries.toSpliced(absoluteFrom, 1).toSpliced(at, 0, item))
	}

	/** Commits the visible order (shuffle off); the item keeps its entry id. */
	insertUpcoming = (item: QueueItem, slot: number): void => {
		const at = this.#index + 1 + Math.max(0, Math.min(slot, this.upcomingCount))

		this.#applyCommitted((entries) =>
			entries.toSpliced(at, 0, { entryId: item.entryId, trackId: item.trackId }),
		)
	}

	clearUpcoming = (): void => {
		this.#apply((entries) => entries.slice(0, this.#index + 1))
	}

	removeAll = (id: number, preserveReturnPoint = false): void => {
		this.#apply(
			(entries) => entries.filter((entry) => entry.trackId !== id),
			preserveReturnPoint,
		)
	}

	/** Never removes the cursor row. */
	removeEntries = (entryIds: ReadonlySet<number>): void => {
		const cursorEntryId = this.cursorEntry?.entryId
		this.#apply((entries) =>
			entries.filter(
				(entry) => entry.entryId === cursorEntryId || !entryIds.has(entry.entryId),
			),
		)
	}

	/**
	 * The single mutation frame: a pure entries → entries transform, after which
	 * the cursor re-resolves by the cursor row's entry id. During a manual detour,
	 * removing the source return point instead leaves the cursor just before its
	 * logical successor, so playback resumes forward rather than at the queue start.
	 * Transforms never adjust the cursor themselves.
	 */
	#apply = (
		transform: (entries: readonly SourceEntry[]) => SourceEntry[],
		preserveReturnPoint = false,
	): void => {
		const next = transform(this.#entries)
		this.#index = this.#resolveCursorAfterMutation(next, preserveReturnPoint)
		this.#entries = next
		if (next.length === 0) {
			this.origin = null
		}
	}

	#resolveCursorAfterMutation = (
		next: readonly SourceEntry[],
		preserveReturnPoint: boolean,
	): number => {
		const cursorEntryId = this.#entries[this.#index]?.entryId
		if (cursorEntryId === undefined) {
			return -1
		}

		const cursorIndex = next.findIndex((entry) => entry.entryId === cursorEntryId)
		if (cursorIndex !== -1 || !preserveReturnPoint) {
			return cursorIndex
		}

		const survivingEntryIds = new Set(next.map((entry) => entry.entryId))
		const predecessor = this.#entries
			.slice(0, this.#index)
			.findLast((entry) => survivingEntryIds.has(entry.entryId))

		return predecessor === undefined
			? -1
			: next.findIndex((entry) => entry.entryId === predecessor.entryId)
	}

	/**
	 * `#apply` with the resulting order locked in as canonical, so the transform may
	 * work in terms of rows without a rank and introduce new ones.
	 */
	#applyCommitted = (transform: (entries: readonly QueueItem[]) => QueueItem[]): void => {
		this.shuffle = false
		this.#apply((entries) =>
			transform(entries).map(({ entryId, trackId }, index) => ({
				entryId,
				trackId,
				canonical: index,
			})),
		)
	}

	#indexOfEntry = (entryId: number): number =>
		this.#entries.findIndex((entry) => entry.entryId === entryId)

	/** True when the cursor moved; an absent or out-of-range target moves nothing. */
	#jumpToIndex = (absolute: number | undefined): boolean => {
		if (absolute === undefined || absolute < 0 || absolute >= this.#entries.length) {
			return false
		}

		this.#index = absolute

		return true
	}

	/** The index one step from the cursor, wrapping when `loop`; undefined at an end. */
	#stepped = (delta: 1 | -1, loop: boolean): number | undefined => {
		const { length } = this.#entries
		const next = this.#index + delta

		if (next >= 0 && next < length) {
			return next
		}

		if (!loop || length === 0) {
			return undefined
		}

		return next < 0 ? length - 1 : 0
	}
}
