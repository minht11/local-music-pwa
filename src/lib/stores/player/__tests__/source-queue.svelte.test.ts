import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SourceQueue } from '$lib/stores/player/source-queue.svelte.ts'

let q!: SourceQueue
let cleanup: () => void

const upcoming = (queue: SourceQueue): number[] =>
	Array.from({ length: queue.upcomingCount }, (_, i) => queue.upcomingAt(i)?.trackId as number)

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
			expect(q.entryBeforeNext?.trackId).toBe(20)
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
			// The gap follows the first shuffled row; everything else is upcoming.
			expect(q.upcomingCount).toBe(4)
			const all = [q.entryBeforeNext?.trackId, ...upcoming(q)].toSorted(
				(a, b) => (a ?? 0) - (b ?? 0),
			)
			expect(all).toEqual([1, 2, 3, 4, 5])
		})

		it('reports no previous entry for an empty list', () => {
			q.setItems([], 0, { type: 'album', name: 'Empty' })
			expect(q.entryBeforeNext).toBeUndefined()
			expect(q.upcomingCount).toBe(0)
			expect(q.origin).toBeNull()
		})

		it('replaces a shuffled source without retaining its snapshot', () => {
			q.setItems([1, 2, 3], 'shuffle', null)
			q.setItems([4, 5, 6], 'shuffle', null)

			expect(q.shuffle).toBe(true)
			q.toggleShuffle()
			q.makeAllUpcoming()
			expect(upcoming(q)).toEqual([4, 5, 6])
		})
	})

	describe('advance / peekNext / stepBack', () => {
		it('advance moves to the next row', () => {
			q.setItems([1, 2, 3], 0, null)
			expect(q.advance(false)).toMatchObject({ trackId: 2 })
			expect(q.entryBeforeNext?.trackId).toBe(2)
			expect(upcoming(q)).toEqual([3])
		})

		it('advance does not move at the end without loop', () => {
			q.setItems([1, 2], 1, null)
			expect(q.advance(false)).toBeUndefined()
		})

		it('advance wraps with loop', () => {
			q.setItems([1, 2], 1, null)
			expect(q.advance(true)).toMatchObject({ trackId: 1 })
			expect(q.entryBeforeNext?.trackId).toBe(1)
		})

		it('peekNext does not move the source gap', () => {
			q.setItems([1, 2, 3], 0, null)
			expect(q.peekNext(false)).toBe(2)
			expect(q.entryBeforeNext?.trackId).toBe(1)
			expect(upcoming(q)).toEqual([2, 3])
		})

		it('stepBack moves back and wraps with loop', () => {
			q.setItems([1, 2, 3], 0, null)
			expect(q.stepBack(false)).toBeUndefined()
			expect(q.stepBack(true)).toMatchObject({ trackId: 3 })
			expect(q.entryBeforeNext?.trackId).toBe(3)
			expect(q.upcomingCount).toBe(0)
		})
	})

	describe('upcomingIndexOf', () => {
		it('finds only upcoming entries by their distinct entry ids', () => {
			q.setItems([7, 7, 8], 0, null)
			const anchorEntryId = q.entryBeforeNext?.entryId
			const duplicateEntryId = q.upcomingAt(0)?.entryId
			const nextEntryId = q.upcomingAt(1)?.entryId
			invariant(
				anchorEntryId !== undefined &&
					duplicateEntryId !== undefined &&
					nextEntryId !== undefined,
			)

			expect(q.upcomingIndexOf(anchorEntryId)).toBe(-1)
			expect(q.upcomingIndexOf(duplicateEntryId)).toBe(0)
			expect(q.upcomingIndexOf(nextEntryId)).toBe(1)
			expect(q.upcomingIndexOf(999_999)).toBe(-1)

			q.advance(false)
			expect(q.upcomingIndexOf(duplicateEntryId)).toBe(-1)
			expect(q.upcomingIndexOf(nextEntryId)).toBe(0)
		})
	})

	describe('jumpToEntryId / jumpToTrackId', () => {
		it('jumps to a row by entry id, backward included', () => {
			q.setItems([1, 2, 3], 0, null)
			const firstEntryId = q.entryBeforeNext?.entryId
			invariant(firstEntryId !== undefined)
			q.advance(false)
			q.advance(false)
			expect(q.entryBeforeNext?.trackId).toBe(3)

			expect(q.jumpToEntryId(firstEntryId)).toMatchObject({ entryId: firstEntryId })
			expect(q.entryBeforeNext?.entryId).toBe(firstEntryId)
			expect(upcoming(q)).toEqual([2, 3])
		})

		it('ignores an unknown entry id', () => {
			q.setItems([1, 2], 0, null)
			expect(q.jumpToEntryId(999_999)).toBeUndefined()
			expect(q.entryBeforeNext?.trackId).toBe(1)
		})

		it('jumps to the first row playing a track id, backward included', () => {
			q.setItems([1, 2, 3], 2, null)
			expect(q.jumpToTrackId(1)).toMatchObject({ trackId: 1 })
			expect(q.entryBeforeNext?.trackId).toBe(1)
			expect(upcoming(q)).toEqual([2, 3])
		})

		it('ignores a track id that is not in the queue', () => {
			q.setItems([1, 2], 0, null)
			expect(q.jumpToTrackId(99)).toBeUndefined()
			expect(q.entryBeforeNext?.trackId).toBe(1)
		})
	})

	describe('toggleShuffle', () => {
		it('pins the row before the gap and keeps all ids', () => {
			q.setItems([10, 20, 30, 40], 1, null)
			q.toggleShuffle()
			expect(q.shuffle).toBe(true)
			expect(q.entryBeforeNext?.trackId).toBe(20)
			// The pinned row moves to the front: everything else is upcoming.
			expect(q.upcomingCount).toBe(3)
			expect(
				[q.entryBeforeNext?.trackId, ...upcoming(q)].toSorted(
					(a, b) => (a ?? 0) - (b ?? 0),
				),
			).toEqual([10, 20, 30, 40])
		})

		it('restores the pre-shuffle order with the correct gap', () => {
			q.setItems([10, 20, 30], 1, null)
			q.toggleShuffle()
			q.toggleShuffle()
			expect(q.shuffle).toBe(false)
			// The gap follows 20 (index 1); only the anchor and upcoming rows are observable.
			expect(q.entryBeforeNext?.trackId).toBe(20)
			expect(upcoming(q)).toEqual([30])
		})

		it('handles an empty queue (no previous entry)', () => {
			q.setItems([], 0, null)
			q.toggleShuffle()
			expect(q.shuffle).toBe(true)
			expect(q.entryBeforeNext).toBeUndefined()
		})
	})

	describe('removeUpcomingAt', () => {
		it('removes an upcoming track without moving the gap', () => {
			q.setItems([1, 2, 3, 4], 1, null)
			q.removeUpcomingAt(0)
			expect(upcoming(q)).toEqual([4])
			expect(q.entryBeforeNext?.trackId).toBe(2)
		})

		it('preserves the unshuffled order across removal', () => {
			q.setItems([1, 2, 3, 4], 0, null)
			q.removeUpcomingAt(1)
			expect([q.entryBeforeNext?.trackId, ...upcoming(q)]).toEqual([1, 2, 4])
		})

		it('filters the shuffle snapshot by entry id when a duplicate is removed', () => {
			q.setItems([7, 7, 8], 0, null)
			q.toggleShuffle()
			const duplicate = Array.from({ length: q.upcomingCount }, (_, i) =>
				q.upcomingAt(i),
			).find((entry) => entry?.trackId === 7)
			invariant(duplicate !== undefined)
			q.removeEntries(new Set([duplicate.entryId]))
			q.toggleShuffle()

			expect([q.entryBeforeNext?.trackId, ...upcoming(q)]).toEqual([7, 8])
		})
	})

	describe('reordering within upcoming', () => {
		it('preserves the origin when reordering is the only mutation', () => {
			q.setItems([1, 2], -1, { type: 'album', name: 'A' })

			q.moveUpcoming(0, 1)

			expect(upcoming(q)).toEqual([2, 1])
			expect(q.origin).toEqual({ type: 'album', name: 'A' })
		})

		it('reorders within upcoming, drops shuffle, and commits the visible order', () => {
			q.setItems([1, 2, 3, 4], 0, null)
			q.toggleShuffle()
			const before = upcoming(q)

			q.moveUpcoming(0, 2)

			expect(q.shuffle).toBe(false)
			const reordered = [before[1], before[2], before[0]]
			expect(upcoming(q)).toEqual(reordered)

			q.toggleShuffle()
			q.toggleShuffle()
			expect(upcoming(q)).toEqual(reordered)
		})

		it('moves forward correctly', () => {
			q.setItems([1, 2, 3, 4], 0, null)
			q.moveUpcoming(0, 2) // upcoming [2,3,4] → move 2 to index 2
			expect(upcoming(q)).toEqual([3, 4, 2])
		})
	})

	describe('insertUpcoming', () => {
		it('inserts at the given upcoming position', () => {
			q.setItems([1, 2, 3], 0, null)
			q.insertUpcoming({ trackId: 9, entryId: 900 }, 1)
			expect(upcoming(q)).toEqual([2, 9, 3])
		})

		it('drops the shuffle snapshot when inserting', () => {
			q.setItems([1, 2, 3], 0, null)
			q.toggleShuffle()
			q.insertUpcoming({ trackId: 9, entryId: 900 }, 0)
			const committed = upcoming(q)

			expect(q.shuffle).toBe(false)
			q.toggleShuffle()
			q.toggleShuffle()
			expect(upcoming(q)).toEqual(committed)
		})
	})

	describe('clearUpcoming', () => {
		it('keeps rows before the gap and drops the rest', () => {
			q.setItems([1, 2, 3, 4], 1, null)
			q.clearUpcoming()
			expect(q.upcomingCount).toBe(0)
			expect(q.entryBeforeNext?.trackId).toBe(2)
		})

		it('clears the origin when nothing remains', () => {
			q.setItems([1, 2], -1, { type: 'album', name: 'A' })
			q.clearUpcoming()
			expect(q.origin).toBeNull()
		})

		it('does not bring cleared rows back when shuffle is disabled', () => {
			q.setItems([1, 2, 3], 0, null)
			q.toggleShuffle()
			q.clearUpcoming()
			q.toggleShuffle()

			expect(q.upcomingCount).toBe(0)
		})
	})

	describe('removeTracks', () => {
		it('clears the origin when no source rows survive', () => {
			q.setItems([1], 0, { type: 'album', name: 'A' })

			q.removeTracks(new Set([1]))

			expect(q.origin).toBeNull()
		})

		it('removes every occurrence in one pass and keeps the row before the gap', () => {
			q.setItems([1, 9, 2, 9, 3], 4, null) // gap follows the last row (3)
			q.removeTracks(new Set([9]))
			expect([q.entryBeforeNext?.trackId, ...upcoming(q)]).toEqual([3])
			// The earlier survivors remain before the row preceding the gap, in order.
			q.stepBack(false)
			expect(q.entryBeforeNext?.trackId).toBe(2)
			q.stepBack(false)
			expect(q.entryBeforeNext?.trackId).toBe(1)
		})

		it('keeps the gap before the logical successor when its anchor track is removed', () => {
			q.setItems([1, 2, 3], 1, null)
			q.removeTracks(new Set([2]))
			expect(q.entryBeforeNext?.trackId).toBe(1)
			expect(upcoming(q)).toEqual([3])
		})

		it('keeps the resume gap before the logical successor during a manual detour', () => {
			q.setItems([1, 2, 3], 1, null)
			q.removeTracks(new Set([2]))

			expect(q.entryBeforeNext?.trackId).toBe(1)
			q.advance(false)
			expect(q.entryBeforeNext?.trackId).toBe(3)
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

		it('pins the exact occurrence when the previous-row id has duplicates', () => {
			q.setItems([7, 7], 1, null) // gap follows the second occurrence
			const entryBeforeNextId = q.entryBeforeNext?.entryId
			invariant(entryBeforeNextId !== undefined)

			q.toggleShuffle()
			expect(q.entryBeforeNext?.entryId).toBe(entryBeforeNextId)

			q.toggleShuffle()
			expect(q.entryBeforeNext?.entryId).toBe(entryBeforeNextId)
			// Still the second occurrence: nothing follows it.
			expect(q.upcomingCount).toBe(0)
		})

		it('removeEntries drops addressed rows but never the row before the gap', () => {
			q.setItems([1, 2, 3, 4], 1, null)
			const entryBeforeNextId = q.entryBeforeNext?.entryId
			const upcomingEntryId = q.upcomingAt(0)?.entryId
			invariant(entryBeforeNextId !== undefined && upcomingEntryId !== undefined)

			q.removeEntries(new Set([entryBeforeNextId, upcomingEntryId]))

			expect(q.entryBeforeNext?.trackId).toBe(2)
			expect(upcoming(q)).toEqual([4])
			// The row before the gap is untouched.
			q.stepBack(false)
			expect(q.entryBeforeNext?.trackId).toBe(1)
		})

		it('insertUpcoming keeps the inserted row’s entry id', () => {
			q.setItems([1, 2], 0, null)
			q.insertUpcoming({ trackId: 9, entryId: 12_345 }, 0)
			expect(q.upcomingAt(0)?.entryId).toBe(12_345)
			expect(q.upcomingAt(0)?.trackId).toBe(9)
		})

		it('the row before the gap keeps its identity across a committed reorder', () => {
			q.setItems([1, 2, 3], 0, null)
			const entryBeforeNextId = q.entryBeforeNext?.entryId
			invariant(entryBeforeNextId !== undefined)

			q.moveUpcoming(0, 1)

			expect(q.entryBeforeNext?.entryId).toBe(entryBeforeNextId)
			expect(q.entryBeforeNext?.trackId).toBe(1)
			expect(q.upcomingCount).toBe(2)
		})
	})

	describe('gap re-resolution under duplicate track ids', () => {
		it('removing an earlier duplicate keeps the gap after its exact record', () => {
			q.setItems([7, 7, 7], 0, null)
			const firstEntryId = q.entryBeforeNext?.entryId
			const thirdEntryId = q.upcomingAt(1)?.entryId // the third copy
			invariant(firstEntryId !== undefined && thirdEntryId !== undefined)

			// Play the third copy, then drop the first copy by entry id. A naive
			// indexOf(trackId) would re-resolve to the wrong duplicate.
			q.jumpToEntryId(thirdEntryId)
			expect(q.entryBeforeNext?.entryId).toBe(thirdEntryId)

			q.removeEntries(new Set([firstEntryId]))

			expect(q.entryBeforeNext?.entryId).toBe(thirdEntryId)
			expect(q.entryBeforeNext?.trackId).toBe(7)
			// Still the last row, now with one copy played behind it.
			expect(q.upcomingCount).toBe(0)
			q.stepBack(false)
			expect(q.entryBeforeNext?.entryId).not.toBe(thirdEntryId)
			expect(q.entryBeforeNext?.trackId).toBe(7)
		})

		it('drops the row before the gap when every duplicate is removed', () => {
			q.setItems([7, 7, 7], 1, null) // gap follows the middle copy
			q.removeTracks(new Set([7])) // drops every copy, including the row before the gap
			expect(q.entryBeforeNext).toBeUndefined()
			expect(q.upcomingCount).toBe(0)
		})
	})
})
