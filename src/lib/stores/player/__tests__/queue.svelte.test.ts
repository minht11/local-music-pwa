import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueueStore } from '$lib/stores/player/queue.svelte.ts'

// Prevent BroadcastChannel usage and DB wiring in tests
vi.mock('$lib/db/events.ts', () => ({
	onDatabaseChange: vi.fn(() => () => {}),
	dispatchDatabaseChangedEvent: vi.fn(),
}))

let q!: QueueStore
let cleanupQueue: () => void

beforeEach(() => {
	cleanupQueue = $effect.root(() => {
		q = new QueueStore()
	})
})

afterEach(() => {
	cleanupQueue()
	vi.clearAllMocks()
})

describe('QueueStore', () => {
	describe('setTrack', () => {
		it('sets queue and active index', () => {
			q.setTrack(1, [10, 20, 30])
			expect(q.itemsIds).toEqual([10, 20, 30])
			expect(q.current?.index).toBe(1)
		})

		it('returns null as active entry for an empty queue', () => {
			q.setTrack(0, [])
			expect(q.current).toBeNull()
			expect(q.isQueueEmpty).toBe(true)
		})

		it("shuffles queue and pins active track to index 0 when 'shuffle' is the track index", () => {
			q.setTrack('shuffle', [1, 2, 3, 4, 5])
			expect(q.shuffle).toBe(true)
			expect(q.current?.index).toBe(0)
			expect(q.itemsIds.toSorted((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
		})

		it('disables shuffle when a new queue is set with a numeric index', () => {
			q.setTrack('shuffle', [1, 2])
			q.setTrack(0, [3, 4])
			expect(q.shuffle).toBe(false)
		})

		it('changes only the active index when no new queue is given', () => {
			q.setTrack(0, [10, 20, 30])
			q.setTrack(2)
			expect(q.itemsIds).toEqual([10, 20, 30])
			expect(q.current?.index).toBe(2)
		})
	})

	describe('peekNext / peekPrev', () => {
		it('peekNext returns the next entry', () => {
			q.setTrack(1, [1, 2, 3])
			expect(q.peekNext()?.index).toBe(2)
		})

		it('peekNext without loop returns null at the end of the queue', () => {
			q.setTrack(2, [1, 2, 3])
			expect(q.peekNext()).toBeNull()
		})

		it('peekNext with loop wraps to index 0 at the end', () => {
			q.setTrack(2, [1, 2, 3])
			expect(q.peekNext(true)?.index).toBe(0)
		})

		it('peekPrev returns the previous entry', () => {
			q.setTrack(2, [1, 2, 3])
			expect(q.peekPrev()?.index).toBe(1)
		})

		it('peekPrev without loop returns null at the start of the queue', () => {
			q.setTrack(0, [1, 2, 3])
			expect(q.peekPrev()).toBeNull()
		})

		it('peekPrev with loop wraps to the last entry at the start', () => {
			q.setTrack(0, [1, 2, 3])
			expect(q.peekPrev(true)?.index).toBe(2)
		})
	})

	describe('toggleShuffle', () => {
		it('enables shuffle and moves the active track to index 0', () => {
			q.setTrack(1, [10, 20, 30])
			q.toggleShuffle()
			expect(q.shuffle).toBe(true)
			expect(q.current?.index).toBe(0)
			expect(q.itemsIds[0]).toBe(20)
		})

		it('shuffled list contains all original IDs', () => {
			q.setTrack(0, [10, 20, 30, 40, 50])
			q.toggleShuffle()
			expect(q.itemsIds.toSorted((a, b) => a - b)).toEqual([10, 20, 30, 40, 50])
		})

		it('disables shuffle and restores original order with the correct active index', () => {
			q.setTrack(1, [10, 20, 30])
			q.toggleShuffle()
			q.toggleShuffle()
			expect(q.shuffle).toBe(false)
			expect(q.itemsIds).toEqual([10, 20, 30])
			expect(q.current?.index).toBe(1)
		})

		it('preserves the active track ID when disabling after navigating in shuffle mode', () => {
			q.setTrack(0, [10, 20, 30])
			q.toggleShuffle()
			const navigatedId = q.itemsIds[1] as number
			q.setTrack(1)
			q.toggleShuffle()
			expect(q.current?.id).toBe(navigatedId)
			expect(q.itemsIds).toEqual([10, 20, 30])
		})

		it('sets active entry to null when enabling with no currently active track', () => {
			q.setTrack(0, [10, 20, 30])
			q.removeFromQueue(0) // active track removed → current becomes null
			q.toggleShuffle()
			expect(q.shuffle).toBe(true)
			expect(q.current).toBeNull()
			expect(q.itemsIds.toSorted((a, b) => a - b)).toEqual([20, 30])
		})

		it('toggles gracefully on an empty queue', () => {
			q.toggleShuffle()
			expect(q.shuffle).toBe(true)
			expect(q.current).toBeNull()
			expect(q.itemsIds).toEqual([])
			q.toggleShuffle()
			expect(q.shuffle).toBe(false)
			expect(q.current).toBeNull()
		})
	})

	describe('addToQueue', () => {
		it('appends a single track', () => {
			q.setTrack(0, [1, 2])
			q.addToQueue(3)
			expect(q.itemsIds).toEqual([1, 2, 3])
		})

		it('appends multiple tracks', () => {
			q.setTrack(0, [1])
			q.addToQueue([2, 3])
			expect(q.itemsIds).toEqual([1, 2, 3])
		})

		it('activates index 0 when the queue was empty', () => {
			expect(q.current).toBeNull()
			q.addToQueue(5)
			expect(q.current?.index).toBe(0)
		})

		it('while shuffled, added track is visible immediately and survives toggle-off', () => {
			q.setTrack(0, [10, 20])
			q.toggleShuffle()
			q.addToQueue(30)
			expect(q.itemsIds).toContain(30)
			q.toggleShuffle()
			expect(q.itemsIds).toContain(30)
		})
	})

	describe('removeFromQueue', () => {
		it('removes a track by index', () => {
			q.setTrack(0, [10, 20, 30])
			q.removeFromQueue(1)
			expect(q.itemsIds).toEqual([10, 30])
		})

		it('decrements active index when removing a track before it', () => {
			q.setTrack(2, [10, 20, 30])
			q.removeFromQueue(0)
			expect(q.current?.index).toBe(1)
		})

		it('clears active entry when removing the active track', () => {
			q.setTrack(1, [10, 20, 30])
			q.removeFromQueue(1)
			expect(q.current).toBeNull()
		})

		it('does not change active index when removing a track after it', () => {
			q.setTrack(0, [10, 20, 30])
			q.removeFromQueue(2)
			expect(q.current?.index).toBe(0)
		})

		it('ignores an out-of-bounds index', () => {
			q.setTrack(0, [10, 20])
			q.removeFromQueue(5)
			expect(q.itemsIds).toEqual([10, 20])
		})

		it('removes the track from both lists when shuffle is enabled', () => {
			q.setTrack(0, [10, 20, 30])
			q.toggleShuffle()
			const removedId = q.itemsIds[1] as number
			q.removeFromQueue(1)
			expect(q.itemsIds).not.toContain(removedId)
			q.toggleShuffle()
			expect(q.itemsIds).not.toContain(removedId)
		})
	})

	describe('clearQueue', () => {
		it('empties the queue and resets the active entry', () => {
			q.setTrack(1, [1, 2, 3])
			q.clearQueue()
			expect(q.itemsIds).toEqual([])
			expect(q.current).toBeNull()
			expect(q.isQueueEmpty).toBe(true)
		})
	})

	describe('moveQueueItem', () => {
		it('moves an item forward', () => {
			q.setTrack(0, [10, 20, 30, 40])
			q.moveQueueItem(0, 2)
			expect(q.itemsIds).toEqual([20, 30, 10, 40])
		})

		it('moves an item backward', () => {
			q.setTrack(0, [10, 20, 30, 40])
			q.moveQueueItem(3, 1)
			expect(q.itemsIds).toEqual([10, 40, 20, 30])
		})

		it('updates active index when moving the active track', () => {
			q.setTrack(0, [10, 20, 30])
			q.moveQueueItem(0, 2)
			expect(q.current?.index).toBe(2)
			expect(q.current?.id).toBe(10)
		})

		it('decrements active index when a track moves from before to after it', () => {
			q.setTrack(2, [10, 20, 30, 40])
			q.moveQueueItem(0, 3)
			// 10 moves after 30 (the active track), so active index shifts 2 → 1
			expect(q.current?.index).toBe(1)
			expect(q.current?.id).toBe(30)
		})

		it('increments active index when a track moves from after to before it', () => {
			q.setTrack(1, [10, 20, 30, 40])
			q.moveQueueItem(3, 0)
			// 40 moves before 20 (the active track), so active index shifts 1 → 2
			expect(q.current?.index).toBe(2)
			expect(q.current?.id).toBe(20)
		})

		it('does nothing for out-of-bounds indices', () => {
			q.setTrack(0, [10, 20, 30])
			q.moveQueueItem(-1, 1)
			q.moveQueueItem(0, 5)
			expect(q.itemsIds).toEqual([10, 20, 30])
		})

		it('does nothing when from and to are the same index', () => {
			q.setTrack(0, [10, 20, 30])
			q.moveQueueItem(1, 1)
			expect(q.itemsIds).toEqual([10, 20, 30])
		})

		it('commits the current shuffle order and disables shuffle when moving', () => {
			q.setTrack(0, [10, 20, 30])
			q.toggleShuffle()
			const shuffledOrder = [...q.itemsIds]
			q.moveQueueItem(0, 1)
			expect(q.shuffle).toBe(false)
			// The move applies to the committed shuffle order
			const expected = [...shuffledOrder]
			const moved = expected.splice(0, 1)[0]
			if (moved !== undefined) {
				expected.splice(1, 0, moved)
			}
			expect(q.itemsIds).toEqual(expected)
		})
	})
})
