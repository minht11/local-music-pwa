import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { QueueStore } from '$lib/stores/player/queue.svelte.ts'

let q!: QueueStore
let cleanupQueue: () => void

const manual = (queue: QueueStore): number[] =>
	Array.from(
		{ length: queue.count('manual') },
		(_, i) => queue.itemAt('manual', i)?.trackId as number,
	)

const upcomingSource = (queue: QueueStore): number[] =>
	Array.from(
		{ length: queue.count('source') },
		(_, i) => queue.itemAt('source', i)?.trackId as number,
	)

beforeEach(() => {
	cleanupQueue = $effect.root(() => {
		q = new QueueStore()
	})
})

afterEach(() => {
	cleanupQueue()
})

describe('QueueStore', () => {
	describe('setSource', () => {
		it('replaces the source and sets the current track', () => {
			q.setSource([10, 20, 30], 1)
			expect(q.current).toMatchObject({ layer: 'source', trackId: 20 })
			expect(upcomingSource(q)).toEqual([30])
		})

		it('returns null for an empty source', () => {
			expect(q.setSource([], 0)).toBeNull()
			expect(q.current).toBeNull()
			expect(q.isEmpty).toBe(true)
		})

		it('stores the origin', () => {
			q.setSource([1], 0, { type: 'album', name: 'A' })
			expect(q.origin).toEqual({ type: 'album', name: 'A' })
		})

		it('keeps the manual queue when the source is replaced', () => {
			q.setSource([1, 2], 0)
			q.enqueue([9], 'next')
			q.setSource([3, 4], 0)
			expect(manual(q)).toEqual([9])
		})
	})

	describe('current', () => {
		it('reports the manual layer while a manual track plays', () => {
			q.setSource([1], 0)
			q.enqueue([9], 'next')
			q.advance()
			expect(q.current).toMatchObject({ layer: 'manual', trackId: 9 })
		})
	})

	describe('advance', () => {
		it('consumes the manual queue first, then resumes the source', () => {
			q.setSource([1, 2, 3], 0)
			q.enqueue([8, 9], 'next')

			expect(q.advance()).toMatchObject({ layer: 'manual', trackId: 8 })
			expect(manual(q)).toEqual([9])
			expect(q.advance()).toMatchObject({ layer: 'manual', trackId: 9 })
			expect(q.advance()).toMatchObject({ layer: 'source', trackId: 2 })
		})

		it('returns null at the end without loop, wraps with loop', () => {
			q.setSource([1, 2], 1)
			expect(q.advance(false)).toBeNull()
			expect(q.advance(true)).toMatchObject({ layer: 'source', trackId: 1 })
		})

		it('keeps a playing manual track when the source cannot step', () => {
			q.setSource([1, 2], 1) // current is the last source row
			q.enqueue([9], 'next')
			expect(q.advance()).toMatchObject({ layer: 'manual', trackId: 9 })

			// The step fails, so nothing is committed: reverting to the detour point
			// here would show a track the player is not playing.
			expect(q.advance(false)).toBeNull()
			expect(q.current).toMatchObject({ layer: 'manual', trackId: 9 })
		})

		it('keeps a playing manual track when the source is empty', () => {
			q.enqueue([8, 9], 'last')
			expect(q.advance(true)).toMatchObject({ layer: 'manual', trackId: 8 })
			expect(q.advance(true)).toMatchObject({ layer: 'manual', trackId: 9 })

			expect(q.advance(true)).toBeNull()
			expect(q.current).toMatchObject({ layer: 'manual', trackId: 9 })
		})
	})

	describe('peekNext', () => {
		it('returns the first manual id, then the next source id, without consuming', () => {
			q.setSource([1, 2], 0)
			q.enqueue([9], 'next')
			expect(q.peekNext()).toBe(9)
			expect(manual(q)).toEqual([9])

			q.clear('manual')
			expect(q.peekNext()).toBe(2)
		})

		it('wraps with loop', () => {
			q.setSource([1, 2], 1)
			expect(q.peekNext(false)).toBeNull()
			expect(q.peekNext(true)).toBe(1)
		})
	})

	describe('stepBack', () => {
		it('navigates the source', () => {
			q.setSource([1, 2, 3], 2)
			expect(q.stepBack()).toMatchObject({ layer: 'source', trackId: 2 })
		})

		it('returns to the detour point from a manual track', () => {
			q.setSource([1, 2, 3], 1)
			q.enqueue([9], 'next')
			q.advance()
			expect(q.current).toMatchObject({ layer: 'manual', trackId: 9 })
			expect(q.stepBack()).toMatchObject({ layer: 'source', trackId: 2 })
		})

		it('returns null from a manual track with no source', () => {
			q.enqueue([9], 'last')
			q.advance()
			expect(q.current).toMatchObject({ layer: 'manual', trackId: 9 })
			expect(q.stepBack(true)).toBeNull()
		})
	})

	describe('enqueue ordering', () => {
		it('play next chains, add to queue appends behind the block', () => {
			q.setSource([1], 0)
			q.enqueue([8], 'next')
			q.enqueue([20], 'last')
			q.enqueue([9], 'next')
			expect(manual(q)).toEqual([8, 9, 20])
		})

		it('starts a new play-next block after the previous one drains', () => {
			q.setSource([1, 2], 0)
			q.enqueue([8], 'next')
			q.enqueue([20], 'last')
			q.advance() // plays 8
			q.enqueue([9], 'next')
			expect(manual(q)).toEqual([9, 20])
		})

		it('leaves every added track pending when nothing plays', () => {
			q.enqueue([8, 9], 'last')
			expect(q.current).toBeNull()
			expect(manual(q)).toEqual([8, 9])
		})

		it('a row dragged into the play-next block joins it', () => {
			q.setSource([1], 0)
			q.enqueue([8, 9], 'next')
			q.enqueue([20], 'last')
			expect(manual(q)).toEqual([8, 9, 20])

			const queuedEntryId = q.itemAt('manual', 2)?.entryId
			invariant(queuedEntryId !== undefined)
			q.moveEntry(queuedEntryId, { layer: 'manual', slot: 1 })
			expect(manual(q)).toEqual([8, 20, 9])

			// The block is now 8, 20, 9, so play-next chains behind all three.
			q.enqueue([10], 'next')
			expect(manual(q)).toEqual([8, 20, 9, 10])
		})

		it('a row dragged out of the play-next block leaves it, so play-next still plays next', () => {
			q.setSource([1], 0)
			q.enqueue([8, 9], 'next')
			q.enqueue([20], 'last')
			expect(manual(q)).toEqual([8, 9, 20])

			const nextEntryId = q.itemAt('manual', 0)?.entryId
			invariant(nextEntryId !== undefined)
			q.moveEntry(nextEntryId, { layer: 'manual', slot: 3 })
			expect(manual(q)).toEqual([9, 20, 8])

			// The block is now just 9, so play-next lands second.
			q.enqueue([10], 'next')
			expect(manual(q)).toEqual([9, 10, 20, 8])
		})
	})

	describe('playEntry', () => {
		it('plays a manual row, discarding skipped manual tracks', () => {
			q.setSource([1], 0)
			q.enqueue([8, 9, 10], 'last')
			const entryId = q.itemAt('manual', 1)?.entryId
			invariant(entryId !== undefined)

			expect(q.playEntry(entryId)).toMatchObject({ layer: 'manual', trackId: 9 })
			expect(q.current).toMatchObject({ layer: 'manual', trackId: 9 })
			expect(manual(q)).toEqual([10])
		})

		it('jumps to an upcoming source row', () => {
			q.setSource([1, 2, 3], 0)
			const entryId = q.itemAt('source', 1)?.entryId
			invariant(entryId !== undefined)

			expect(q.playEntry(entryId)).toMatchObject({ layer: 'source', trackId: 3 })
			expect(q.current).toMatchObject({ layer: 'source', trackId: 3 })
		})

		it('jumps backward to an already-played source row', () => {
			q.setSource([1, 2, 3], 0)
			// Capture the row while upcoming, then advance past it so it lands behind
			// the source gap — playEntry must still jump back to it.
			const entryId = q.itemAt('source', 0)?.entryId
			invariant(entryId !== undefined)
			q.advance()
			q.advance()
			expect(q.current).toMatchObject({ layer: 'source', trackId: 3 })

			expect(q.playEntry(entryId)).toMatchObject({ layer: 'source', trackId: 2 })
			expect(q.current).toMatchObject({ layer: 'source', trackId: 2 })
		})

		it('returns null for a missing entry id', () => {
			q.setSource([1], 0)
			expect(q.playEntry(999_999)).toBeNull()
		})

		it('returns null for an unknown id while a manual track plays, leaving it playing', () => {
			q.setSource([1], 0)
			q.enqueue([9], 'next')
			q.advance()

			expect(q.playEntry(999_999)).toBeNull()
			expect(q.current).toMatchObject({ layer: 'manual', trackId: 9 })
		})

		it('returns null for the current manual entry id, leaving it playing', () => {
			q.setSource([1], 0)
			q.enqueue([9], 'next')
			q.advance()
			const currentEntryId = q.current?.entryId
			invariant(currentEntryId !== undefined)

			expect(q.playEntry(currentEntryId)).toBeNull()
			expect(q.current).toMatchObject({ layer: 'manual', trackId: 9 })
		})
	})

	describe('playTrackId', () => {
		it('jumps to the track when already in the source (backward allowed)', () => {
			q.setSource([1, 2, 3], 2)
			expect(q.playTrackId(1)).toMatchObject({ layer: 'source', trackId: 1 })
			expect(q.current).toMatchObject({ layer: 'source', trackId: 1 })
		})

		it('starts a fresh single-track source when absent', () => {
			q.setSource([1, 2], 0)
			expect(q.playTrackId(99)).toMatchObject({ layer: 'source', trackId: 99 })
			expect(q.current).toMatchObject({ layer: 'source', trackId: 99 })
			expect(q.count('source')).toBe(0)
		})
	})

	describe('removeEntries', () => {
		it('removes the addressed rows across both layers in one call', () => {
			q.setSource([1, 2, 3], 0)
			q.enqueue([8, 9], 'last')
			const manualEntryId = q.itemAt('manual', 0)?.entryId
			const sourceEntryId = q.itemAt('source', 0)?.entryId
			invariant(manualEntryId !== undefined && sourceEntryId !== undefined)

			q.removeEntries([manualEntryId, sourceEntryId])

			expect(manual(q)).toEqual([9])
			expect(upcomingSource(q)).toEqual([3])
		})

		it('removes exactly the selected occurrence of a duplicated track', () => {
			q.setSource([7, 7, 7], 0)
			const entryId = q.itemAt('source', 1)?.entryId
			invariant(entryId !== undefined)

			q.removeEntries([entryId])

			expect(upcomingSource(q)).toEqual([7])
			expect(q.current?.trackId).toBe(7)
		})

		it('adjusts the play-next block for removed block entries', () => {
			q.setSource([1], 0)
			q.enqueue([8, 9], 'next')
			q.enqueue([20], 'last')
			const entryId = q.itemAt('manual', 0)?.entryId
			invariant(entryId !== undefined)

			q.removeEntries([entryId])
			q.enqueue([10], 'next')

			expect(manual(q)).toEqual([9, 10, 20])
		})

		it('never removes the current entry', () => {
			q.setSource([1, 2], 0)
			const sourceEntryId = q.current?.entryId
			invariant(sourceEntryId !== undefined)

			q.removeEntries([sourceEntryId])
			expect(q.current).toMatchObject({ layer: 'source', trackId: 1 })

			q.enqueue([9], 'next')
			q.advance()
			const manualEntryId = q.current?.entryId
			invariant(manualEntryId !== undefined)

			q.removeEntries([manualEntryId])
			expect(q.current).toMatchObject({ layer: 'manual', trackId: 9 })
		})
	})

	describe('entry ids', () => {
		it('keeps a row id stable from upcoming to current', () => {
			q.setSource([1, 2], 0)
			const upcomingEntryId = q.itemAt('source', 0)?.entryId

			const advanced = q.advance()

			expect(advanced?.entryId).toBe(upcomingEntryId)
			expect(q.current?.entryId).toBe(upcomingEntryId)
		})

		it('never collides across layers', () => {
			q.setSource([1, 2, 3], 0)
			q.enqueue([8, 9], 'last')
			const entryIds = [
				q.current?.entryId,
				q.itemAt('manual', 0)?.entryId,
				q.itemAt('manual', 1)?.entryId,
				q.itemAt('source', 0)?.entryId,
				q.itemAt('source', 1)?.entryId,
			]

			expect(entryIds.every((entryId) => entryId !== undefined)).toBe(true)
			expect(new Set(entryIds).size).toBe(entryIds.length)
		})

		it('travels with a row moved across layers', () => {
			q.setSource([1, 2, 3], 0)
			const entryId = q.itemAt('source', 0)?.entryId
			invariant(entryId !== undefined)

			q.moveEntry(entryId, { layer: 'manual', slot: 0 })

			expect(q.itemAt('manual', 0)?.entryId).toBe(entryId)
		})
	})

	describe('moveEntry', () => {
		it('reorders within the manual layer (downward adjustment)', () => {
			q.setSource([1], 0)
			q.enqueue([10, 20, 30, 40], 'last')
			const entryId = q.itemAt('manual', 0)?.entryId
			invariant(entryId !== undefined)
			q.moveEntry(entryId, { layer: 'manual', slot: 3 })
			expect(manual(q)).toEqual([20, 30, 10, 40])
		})

		it('reorders within the source layer', () => {
			q.setSource([1, 2, 3, 4], 0)
			const entryId = q.itemAt('source', 0)?.entryId
			invariant(entryId !== undefined)
			q.moveEntry(entryId, { layer: 'source', slot: 2 })
			expect(upcomingSource(q)).toEqual([3, 2, 4])
		})

		it('moves a manual track into the source queue', () => {
			q.setSource([1, 2, 3], 0)
			q.enqueue([99], 'last')
			const entryId = q.itemAt('manual', 0)?.entryId
			invariant(entryId !== undefined)
			q.moveEntry(entryId, { layer: 'source', slot: 1 })
			expect(manual(q)).toEqual([])
			expect(upcomingSource(q)).toEqual([2, 99, 3])
		})

		it('moves a source track into the manual queue', () => {
			q.setSource([1, 2, 3], 0)
			const entryId = q.itemAt('source', 0)?.entryId
			invariant(entryId !== undefined)
			q.moveEntry(entryId, { layer: 'manual', slot: 0 })
			expect(manual(q)).toEqual([2])
			expect(upcomingSource(q)).toEqual([3])
		})

		it('joins the play-next block when moved inside it', () => {
			q.setSource([1, 2], 0)
			q.enqueue([8], 'next')
			q.enqueue([20], 'last')

			const entryId = q.itemAt('source', 0)?.entryId
			invariant(entryId !== undefined)
			q.moveEntry(entryId, { layer: 'manual', slot: 0 })
			expect(manual(q)).toEqual([2, 8, 20])

			// a later play-next still chains after the whole block
			q.enqueue([9], 'next')
			expect(manual(q)).toEqual([2, 8, 9, 20])
		})

		it('cross-layer insert dropped inside the play-next block joins it', () => {
			q.setSource([1, 2, 3], 0)
			q.enqueue([8, 9], 'next')
			q.enqueue([20], 'last')
			expect(manual(q)).toEqual([8, 9, 20])

			// slot 0: strictly inside the block, ahead of both next-tagged tracks
			const entryId = q.itemAt('source', 0)?.entryId
			invariant(entryId !== undefined)
			q.moveEntry(entryId, { layer: 'manual', slot: 0 })
			expect(manual(q)).toEqual([2, 8, 9, 20])

			// the moved-in track (2) joined the block, so a later play-next chains
			// after it and the rest of the block
			q.enqueue([10], 'next')
			expect(manual(q)).toEqual([2, 8, 9, 10, 20])
		})

		it('cross-layer insert dropped at the play-next block boundary joins it', () => {
			q.setSource([1, 2, 3], 0)
			q.enqueue([8, 9], 'next')
			q.enqueue([20], 'last')
			expect(manual(q)).toEqual([8, 9, 20])

			// slot 1: right at the boundary, immediately ahead of the last next-tagged track
			const entryId = q.itemAt('source', 0)?.entryId
			invariant(entryId !== undefined)
			q.moveEntry(entryId, { layer: 'manual', slot: 1 })
			expect(manual(q)).toEqual([8, 2, 9, 20])

			q.enqueue([10], 'next')
			expect(manual(q)).toEqual([8, 2, 9, 10, 20])
		})

		it('cross-layer insert dropped after the play-next block boundary does not join it', () => {
			q.setSource([1, 2, 3], 0)
			q.enqueue([8, 9], 'next')
			q.enqueue([20], 'last')
			expect(manual(q)).toEqual([8, 9, 20])

			// slot 2: right after the block, ahead of the plain queued track
			const entryId = q.itemAt('source', 0)?.entryId
			invariant(entryId !== undefined)
			q.moveEntry(entryId, { layer: 'manual', slot: 2 })
			expect(manual(q)).toEqual([8, 9, 2, 20])

			// the moved-in track (2) stayed 'queued', so a later play-next lands
			// before it, not after
			q.enqueue([10], 'next')
			expect(manual(q)).toEqual([8, 9, 10, 2, 20])
		})

		it('ignores a move whose entry id is unknown', () => {
			q.setSource([1], 0)
			q.enqueue([8, 9], 'last')

			q.moveEntry(999_999, { layer: 'manual', slot: 0 })

			expect(manual(q)).toEqual([8, 9])
		})

		it('ignores a move whose row advance consumed mid-drag', () => {
			q.setSource([1, 2, 3], 0)
			q.enqueue([8, 9], 'last')
			// Capture the first manual row, then advance so it becomes the current
			// entry (shifted out of #manual): the drag's entry id is now stale.
			const entryId = q.itemAt('manual', 0)?.entryId
			invariant(entryId !== undefined)

			q.advance()
			expect(q.current).toMatchObject({ layer: 'manual', trackId: 8 })

			q.moveEntry(entryId, { layer: 'manual', slot: 1 })
			expect(manual(q)).toEqual([9])
			expect(upcomingSource(q)).toEqual([2, 3])
		})
	})

	describe('toggleShuffle', () => {
		it('shuffles the source but never the manual queue', () => {
			q.setSource([10, 20, 30, 40, 50], 0)
			q.enqueue([8, 9], 'next')
			q.toggleShuffle()
			expect(manual(q)).toEqual([8, 9])
			q.toggleShuffle()
			expect(manual(q)).toEqual([8, 9])
		})
	})

	describe('clears', () => {
		it("clear('manual') keeps a playing manual track", () => {
			q.setSource([1], 0)
			q.enqueue([8, 9], 'next')
			q.advance()
			q.clear('manual')
			expect(manual(q)).toEqual([])
			expect(q.current).toMatchObject({ layer: 'manual', trackId: 8 })
		})

		it("clear('source') keeps current and played tracks", () => {
			q.setSource([1, 2, 3, 4], 1)
			q.clear('source')
			expect(upcomingSource(q)).toEqual([])
			expect(q.current).toMatchObject({ layer: 'source', trackId: 2 })
		})
	})

	describe('deleted tracks', () => {
		it('purges the track from manual and source in one fan-out', () => {
			q.setSource([1, 9, 2, 9], 0)
			q.enqueue([9, 8], 'last')
			q.removeTrack(9)
			expect(manual(q)).toEqual([8])
			expect([q.current?.trackId, ...upcomingSource(q)]).toEqual([1, 2])
		})

		it('keeps play-next chaining consistent after a block track is deleted', () => {
			q.setSource([1], 0)
			q.enqueue([8, 9], 'next')
			q.enqueue([20], 'last')
			q.removeTrack(8)
			q.enqueue([10], 'next')
			expect(manual(q)).toEqual([9, 10, 20])
		})

		it('clears the active entry when the current source track is deleted', () => {
			q.setSource([10, 20, 30], 1)
			q.removeTrack(20)
			expect(q.current).toBeNull()
		})

		it('selects the source successor when the current manual track is deleted', () => {
			q.setSource([1, 2], 0)
			q.enqueue([9], 'next')
			q.advance()
			q.removeTrack(9)
			expect(q.current).toMatchObject({ layer: 'source', trackId: 2 })
		})

		it('clears current when a deleted manual track has no successor', () => {
			q.enqueue([9], 'next')
			q.advance()
			q.removeTrack(9)
			expect(q.current).toBeNull()
		})

		it('resumes at the source successor when the manual detour return point is deleted', () => {
			q.setSource([1, 2, 3], 1)
			q.enqueue([9], 'next')
			q.advance()

			q.removeTrack(2)

			expect(q.current).toMatchObject({ layer: 'manual', trackId: 9 })
			expect(q.advance()).toMatchObject({ layer: 'source', trackId: 3 })
		})

		it('does not promote an upcoming source row when later batch deletions follow a removed anchor', () => {
			q.setSource([2, 3, 4], 0)
			q.enqueue([9], 'next')
			q.advance()

			q.removeTracks([2, 4])

			expect(q.current).toMatchObject({ layer: 'manual', trackId: 9 })
			expect(q.advance()).toMatchObject({ layer: 'source', trackId: 3 })
		})
	})
})
