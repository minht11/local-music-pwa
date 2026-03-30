import { describe, expect, it } from 'vitest'
import { QueueStore } from '$lib/stores/player/queue.svelte.ts'

const track = (n: number) => n

describe('QueueStore', () => {
	describe('setTrack', () => {
		it('sets queue and active index', () => {
			const q = new QueueStore()
			q.setTrack(1, [10, 20, 30])
			expect(q.itemsIds).toEqual([10, 20, 30])
			expect(q.activeTrackIndex).toBe(1)
		})

		it('sets active index to -1 for empty queue', () => {
			const q = new QueueStore()
			q.setTrack(0, [])
			expect(q.activeTrackIndex).toBe(-1)
			expect(q.isQueueEmpty).toBe(true)
		})

		it('shuffles and pins active index to 0 when shuffle option is set', () => {
			const q = new QueueStore()
			q.setTrack(0, [1, 2, 3, 4, 5], { shuffle: true })
			expect(q.shuffle).toBe(true)
			expect(q.activeTrackIndex).toBe(0)
			expect([...q.itemsIds].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
		})

		it('disables shuffle when new queue is passed without shuffle option', () => {
			const q = new QueueStore()
			q.setTrack(0, [1, 2], { shuffle: true })
			q.setTrack(0, [3, 4])
			expect(q.shuffle).toBe(false)
		})

		it('changes only active index when no new queue is given', () => {
			const q = new QueueStore()
			q.setTrack(0, [10, 20, 30])
			q.setTrack(2)
			expect(q.itemsIds).toEqual([10, 20, 30])
			expect(q.activeTrackIndex).toBe(2)
		})
	})

	describe('getNextIndex / getPrevIndex', () => {
		it('returns next index', () => {
			const q = new QueueStore()
			q.setTrack(1, [track(1), track(2), track(3)])
			expect(q.getNextIndex()).toBe(2)
		})

		it('wraps to 0 at the end', () => {
			const q = new QueueStore()
			q.setTrack(2, [track(1), track(2), track(3)])
			expect(q.getNextIndex()).toBe(0)
		})

		it('returns prev index', () => {
			const q = new QueueStore()
			q.setTrack(2, [track(1), track(2), track(3)])
			expect(q.getPrevIndex()).toBe(1)
		})

		it('wraps to last at the start', () => {
			const q = new QueueStore()
			q.setTrack(0, [track(1), track(2), track(3)])
			expect(q.getPrevIndex()).toBe(2)
		})
	})

	describe('toggleShuffle', () => {
		it('enables shuffle and moves active track to index 0', () => {
			const q = new QueueStore()
			q.setTrack(1, [10, 20, 30])
			q.toggleShuffle()
			expect(q.shuffle).toBe(true)
			expect(q.activeTrackIndex).toBe(0)
			expect(q.itemsIds[0]).toBe(20)
		})

		it('shuffled list contains all original IDs', () => {
			const q = new QueueStore()
			q.setTrack(0, [10, 20, 30, 40, 50])
			q.toggleShuffle()
			expect([...q.itemsIds].sort((a, b) => a - b)).toEqual([10, 20, 30, 40, 50])
		})

		it('disables shuffle and restores original order with correct active index', () => {
			const q = new QueueStore()
			q.setTrack(1, [10, 20, 30])
			q.toggleShuffle()
			q.toggleShuffle()
			expect(q.shuffle).toBe(false)
			expect(q.itemsIds).toEqual([10, 20, 30])
			expect(q.activeTrackIndex).toBe(1)
		})

		it('preserves the active track ID when disabling after navigating in shuffle mode', () => {
			const q = new QueueStore()
			q.setTrack(0, [10, 20, 30])
			q.toggleShuffle()
			// Navigate to the second position in the shuffled list
			const navigatedId = q.itemsIds[1] as number
			q.setTrack(1)
			q.toggleShuffle()
			expect(q.activeTrackId).toBe(navigatedId)
			expect(q.itemsIds).toEqual([10, 20, 30])
		})

		it('sets active index to -1 when enabling with no active track', () => {
			const q = new QueueStore()
			q.setTrack(0, [10, 20, 30])
			q.removeFromQueue(0) // removes the active track → index becomes -1
			q.toggleShuffle()
			expect(q.shuffle).toBe(true)
			expect(q.activeTrackIndex).toBe(-1)
			expect([...q.itemsIds].sort((a, b) => a - b)).toEqual([20, 30])
		})

		it('toggles gracefully on an empty queue', () => {
			const q = new QueueStore()
			q.toggleShuffle()
			expect(q.shuffle).toBe(true)
			expect(q.activeTrackIndex).toBe(-1)
			expect(q.itemsIds).toEqual([])
			q.toggleShuffle()
			expect(q.shuffle).toBe(false)
			expect(q.activeTrackIndex).toBe(-1)
		})
	})

	describe('addToQueue', () => {
		it('appends a single track', () => {
			const q = new QueueStore()
			q.setTrack(0, [1, 2])
			q.addToQueue(3)
			expect(q.itemsIds).toEqual([1, 2, 3])
		})

		it('appends multiple tracks', () => {
			const q = new QueueStore()
			q.setTrack(0, [1])
			q.addToQueue([2, 3])
			expect(q.itemsIds).toEqual([1, 2, 3])
		})

		it('activates index 0 when queue was empty', () => {
			const q = new QueueStore()
			expect(q.activeTrackIndex).toBe(-1)
			q.addToQueue(5)
			expect(q.activeTrackIndex).toBe(0)
		})

		it('while shuffled, added track is visible immediately and survives toggle-off', () => {
			const q = new QueueStore()
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
			const q = new QueueStore()
			q.setTrack(0, [10, 20, 30])
			q.removeFromQueue(1)
			expect(q.itemsIds).toEqual([10, 30])
		})

		it('decrements active index when removing before it', () => {
			const q = new QueueStore()
			q.setTrack(2, [10, 20, 30])
			q.removeFromQueue(0)
			expect(q.activeTrackIndex).toBe(1)
		})

		it('sets active index to -1 when removing the active track', () => {
			const q = new QueueStore()
			q.setTrack(1, [10, 20, 30])
			q.removeFromQueue(1)
			expect(q.activeTrackIndex).toBe(-1)
		})

		it('does not change active index when removing after it', () => {
			const q = new QueueStore()
			q.setTrack(0, [10, 20, 30])
			q.removeFromQueue(2)
			expect(q.activeTrackIndex).toBe(0)
		})

		it('ignores out-of-bounds index', () => {
			const q = new QueueStore()
			q.setTrack(0, [10, 20])
			q.removeFromQueue(5)
			expect(q.itemsIds).toEqual([10, 20])
		})

		it('removes from both lists when shuffle is enabled', () => {
			const q = new QueueStore()
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
		it('empties the queue and resets active index', () => {
			const q = new QueueStore()
			q.setTrack(1, [1, 2, 3])
			q.clearQueue()
			expect(q.itemsIds).toEqual([])
			expect(q.activeTrackIndex).toBe(-1)
			expect(q.isQueueEmpty).toBe(true)
		})
	})
})
