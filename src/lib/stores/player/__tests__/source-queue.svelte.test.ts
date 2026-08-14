import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SourceQueue } from '$lib/stores/player/source-queue.svelte.ts'

let q!: SourceQueue
let cleanup: () => void

const upcoming = (queue: SourceQueue): number[] =>
	Array.from({ length: queue.upcomingCount }, (_, i) => queue.upcomingAt(i)?.trackId as number)

/** How `QueueStore.moveEntry` reorders within a layer: remove, then re-insert. */
const moveUpcoming = (queue: SourceQueue, from: number, to: number): void => {
	const item = queue.upcomingAt(from)
	invariant(item !== undefined)

	queue.removeUpcomingAt(from)
	queue.insertUpcoming(item, to)
}

beforeEach(() => {
	cleanup = $effect.root(() => {
		q = new SourceQueue()
	})
})

afterEach(() => {
	cleanup()
})

describe('SourceQueue', () => {
	describe('setItems', () => {
		it('sets items and starts at the given index', () => {
			q.setItems([10, 20, 30], 1, null)
			expect(q.current?.trackId).toBe(20)
			expect(q.upcomingCount).toBe(1)
			expect(q.upcomingAt(0)?.trackId).toBe(30)
		})

		it('stores the origin', () => {
			q.setItems([1], 0, { type: 'album', name: 'A' })
			expect(q.origin).toEqual({ type: 'album', name: 'A' })
		})

		it('shuffles and starts at the first row when start is shuffle', () => {
			q.setItems([1, 2, 3, 4, 5], 'shuffle', null)
			expect(q.shuffle).toBe(true)
			// Nothing is played: the whole list is current plus upcoming.
			expect(q.upcomingCount).toBe(4)
			const all = [q.current?.trackId, ...upcoming(q)].toSorted((a, b) => (a ?? 0) - (b ?? 0))
			expect(all).toEqual([1, 2, 3, 4, 5])
		})

		it('reports no current row for an empty list', () => {
			q.setItems([], 0, null)
			expect(q.current).toBeUndefined()
			expect(q.upcomingCount).toBe(0)
		})
	})

	describe('advance / peekNext / stepBack', () => {
		it('advance moves to the next row', () => {
			q.setItems([1, 2, 3], 0, null)
			expect(q.advance(false)).toBe(true)
			expect(q.current?.trackId).toBe(2)
			expect(upcoming(q)).toEqual([3])
		})

		it('advance does not move at the end without loop', () => {
			q.setItems([1, 2], 1, null)
			expect(q.advance(false)).toBe(false)
		})

		it('advance wraps with loop', () => {
			q.setItems([1, 2], 1, null)
			expect(q.advance(true)).toBe(true)
			expect(q.current?.trackId).toBe(1)
		})

		it('peekNext does not move the current row', () => {
			q.setItems([1, 2, 3], 0, null)
			expect(q.peekNext(false)).toBe(2)
			expect(q.current?.trackId).toBe(1)
			expect(upcoming(q)).toEqual([2, 3])
		})

		it('stepBack moves back and wraps with loop', () => {
			q.setItems([1, 2, 3], 0, null)
			expect(q.stepBack(false)).toBe(false)
			expect(q.stepBack(true)).toBe(true)
			expect(q.current?.trackId).toBe(3)
			expect(q.upcomingCount).toBe(0)
		})
	})

	describe('jumpToEntryId / jumpToTrackId', () => {
		it('jumps to a row by entry id, backward included', () => {
			q.setItems([1, 2, 3], 0, null)
			const firstEntryId = q.current?.entryId
			invariant(firstEntryId !== undefined)
			q.advance(false)
			q.advance(false)
			expect(q.current?.trackId).toBe(3)

			expect(q.jumpToEntryId(firstEntryId)).toBe(true)
			expect(q.current?.entryId).toBe(firstEntryId)
			expect(upcoming(q)).toEqual([2, 3])
		})

		it('ignores an unknown entry id', () => {
			q.setItems([1, 2], 0, null)
			expect(q.jumpToEntryId(999_999)).toBe(false)
			expect(q.current?.trackId).toBe(1)
		})

		it('jumps to the first row playing a track id, backward included', () => {
			q.setItems([1, 2, 3], 2, null)
			expect(q.jumpToTrackId(1)).toBe(true)
			expect(q.current?.trackId).toBe(1)
			expect(upcoming(q)).toEqual([2, 3])
		})

		it('ignores a track id that is not in the queue', () => {
			q.setItems([1, 2], 0, null)
			expect(q.jumpToTrackId(99)).toBe(false)
			expect(q.current?.trackId).toBe(1)
		})
	})

	describe('toggleShuffle', () => {
		it('pins the current track and keeps all ids', () => {
			q.setItems([10, 20, 30, 40], 1, null)
			q.toggleShuffle()
			expect(q.shuffle).toBe(true)
			expect(q.current?.trackId).toBe(20)
			// The pinned row moves to the front: everything else is upcoming.
			expect(q.upcomingCount).toBe(3)
			expect(
				[q.current?.trackId, ...upcoming(q)].toSorted((a, b) => (a ?? 0) - (b ?? 0)),
			).toEqual([10, 20, 30, 40])
		})

		it('restores canonical order on unshuffle with the correct cursor', () => {
			q.setItems([10, 20, 30], 1, null)
			q.toggleShuffle()
			q.toggleShuffle()
			expect(q.shuffle).toBe(false)
			// cursor is on 20 (index 1); only current + upcoming are observable
			expect(q.current?.trackId).toBe(20)
			expect(upcoming(q)).toEqual([30])
		})

		it('handles an empty queue (no current track)', () => {
			q.setItems([], 0, null)
			q.toggleShuffle()
			expect(q.shuffle).toBe(true)
			expect(q.current).toBeUndefined()
		})
	})

	describe('removeUpcomingAt', () => {
		it('removes an upcoming track without moving the cursor', () => {
			q.setItems([1, 2, 3, 4], 1, null)
			q.removeUpcomingAt(0)
			expect(upcoming(q)).toEqual([4])
			expect(q.current?.trackId).toBe(2)
		})

		it('preserves canonical order across removal (unshuffle restores album order)', () => {
			q.setItems([1, 2, 3, 4], 0, null)
			q.toggleShuffle()
			q.toggleShuffle() // back to canonical [1,2,3,4]
			q.removeUpcomingAt(1) // remove visible upcoming index 1 → track 3
			q.toggleShuffle()
			q.toggleShuffle()
			expect([q.current?.trackId, ...upcoming(q)]).toEqual([1, 2, 4])
		})
	})

	describe('reordering within upcoming', () => {
		it('reorders within upcoming and commits the visible order as canonical', () => {
			q.setItems([1, 2, 3, 4], 0, null)
			q.toggleShuffle()
			const before = upcoming(q)

			moveUpcoming(q, 0, 2)

			expect(q.shuffle).toBe(false)
			const reordered = [before[1], before[2], before[0]]
			expect(upcoming(q)).toEqual(reordered)

			// The committed order is now canonical: a shuffle round-trip restores it.
			q.toggleShuffle()
			q.toggleShuffle()
			expect(upcoming(q)).toEqual(reordered)
		})

		it('moves forward correctly', () => {
			q.setItems([1, 2, 3, 4], 0, null)
			moveUpcoming(q, 0, 2) // upcoming [2,3,4] → move 2 to index 2
			expect(upcoming(q)).toEqual([3, 4, 2])
		})
	})

	describe('insertUpcoming', () => {
		it('inserts at the given upcoming position', () => {
			q.setItems([1, 2, 3], 0, null)
			q.insertUpcoming({ trackId: 9, entryId: 900 }, 1)
			expect(upcoming(q)).toEqual([2, 9, 3])
		})
	})

	describe('clearUpcoming', () => {
		it('keeps current and played tracks, drops the rest', () => {
			q.setItems([1, 2, 3, 4], 1, null)
			q.clearUpcoming()
			expect(q.upcomingCount).toBe(0)
			expect(q.current?.trackId).toBe(2)
		})

		it('clears the origin when nothing remains', () => {
			q.setItems([1, 2], -1, { type: 'album', name: 'A' })
			q.clearUpcoming()
			expect(q.origin).toBeNull()
		})
	})

	describe('removeAll', () => {
		it('removes every occurrence in one pass and keeps the current row', () => {
			q.setItems([1, 9, 2, 9, 3], 4, null) // current is the last row (3)
			q.removeAll(9)
			expect([q.current?.trackId, ...upcoming(q)]).toEqual([3])
			// The two survivors stay behind the current row, in order.
			q.stepBack(false)
			expect(q.current?.trackId).toBe(2)
			q.stepBack(false)
			expect(q.current?.trackId).toBe(1)
		})

		it('drops the current row when its track is removed', () => {
			q.setItems([1, 2, 3], 1, null)
			q.removeAll(2)
			expect(q.current).toBeUndefined()
			// With no current row the survivors are all upcoming again.
			expect(upcoming(q)).toEqual([1, 3])
		})

		it('keeps the return cursor before the logical successor during a manual detour', () => {
			q.setItems([1, 2, 3], 1, null)
			q.removeAll(2, true)

			expect(q.current?.trackId).toBe(1)
			q.advance(false)
			expect(q.current?.trackId).toBe(3)
		})
	})

	describe('entry ids', () => {
		it('keeps each entry id attached to its track across shuffle', () => {
			q.setItems([10, 20, 30, 40], 0, null)
			const trackByEntryId = new Map<number, number>()
			for (let i = 0; i < q.upcomingCount; i += 1) {
				trackByEntryId.set(
					q.upcomingAt(i)?.entryId as number,
					q.upcomingAt(i)?.trackId as number,
				)
			}

			q.toggleShuffle()

			for (let i = 0; i < q.upcomingCount; i += 1) {
				const entryId = q.upcomingAt(i)?.entryId
				invariant(entryId !== undefined)
				expect(q.upcomingAt(i)?.trackId).toBe(trackByEntryId.get(entryId))
			}
		})

		it('pins the exact occurrence when the current id has duplicates', () => {
			q.setItems([7, 7], 1, null) // current is the second occurrence
			const currentEntryId = q.current?.entryId
			invariant(currentEntryId !== undefined)

			q.toggleShuffle()
			expect(q.current?.entryId).toBe(currentEntryId)

			q.toggleShuffle()
			expect(q.current?.entryId).toBe(currentEntryId)
			// Still the second occurrence: nothing follows it.
			expect(q.upcomingCount).toBe(0)
		})

		it('removeEntries drops addressed rows but never the cursor row', () => {
			q.setItems([1, 2, 3, 4], 1, null)
			const currentEntryId = q.current?.entryId
			const upcomingEntryId = q.upcomingAt(0)?.entryId
			invariant(currentEntryId !== undefined && upcomingEntryId !== undefined)

			q.removeEntries(new Set([currentEntryId, upcomingEntryId]))

			expect(q.current?.trackId).toBe(2)
			expect(upcoming(q)).toEqual([4])
			// The played row is untouched.
			q.stepBack(false)
			expect(q.current?.trackId).toBe(1)
		})

		it('insertUpcoming keeps the inserted row’s entry id', () => {
			q.setItems([1, 2], 0, null)
			q.insertUpcoming({ trackId: 9, entryId: 12_345 }, 0)
			expect(q.upcomingAt(0)?.entryId).toBe(12_345)
			expect(q.upcomingAt(0)?.trackId).toBe(9)
		})

		it('the cursor row keeps its identity across a committed reorder', () => {
			q.setItems([1, 2, 3], 0, null)
			const currentEntryId = q.current?.entryId
			invariant(currentEntryId !== undefined)

			// A committed reorder recreates every record (fresh canonical ranks);
			// the cursor must follow the row by entry id, not by object reference.
			moveUpcoming(q, 0, 1)

			expect(q.current?.entryId).toBe(currentEntryId)
			expect(q.current?.trackId).toBe(1)
			expect(q.upcomingCount).toBe(2)
		})
	})

	describe('current row re-resolution under duplicate track ids', () => {
		it('removing an earlier duplicate keeps the current row on its exact record', () => {
			q.setItems([7, 7, 7], 0, null)
			const firstEntryId = q.current?.entryId
			const thirdEntryId = q.upcomingAt(1)?.entryId // the third copy
			invariant(firstEntryId !== undefined && thirdEntryId !== undefined)

			// Play the third copy, then drop the first copy by entry id. A naive
			// indexOf(trackId) would re-resolve to the wrong duplicate.
			q.jumpToEntryId(thirdEntryId)
			expect(q.current?.entryId).toBe(thirdEntryId)

			q.removeEntries(new Set([firstEntryId]))

			expect(q.current?.entryId).toBe(thirdEntryId)
			expect(q.current?.trackId).toBe(7)
			// Still the last row, now with one copy played behind it.
			expect(q.upcomingCount).toBe(0)
			q.stepBack(false)
			expect(q.current?.entryId).not.toBe(thirdEntryId)
			expect(q.current?.trackId).toBe(7)
		})

		it('drops the current row when every duplicate is removed', () => {
			q.setItems([7, 7, 7], 1, null) // current is the middle copy
			q.removeAll(7) // drops every copy, including the current row
			expect(q.current).toBeUndefined()
			expect(q.upcomingCount).toBe(0)
		})
	})
})
