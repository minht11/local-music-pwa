import fc from 'fast-check'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueueStore } from '$lib/stores/player/queue.svelte.ts'
import { actualUpcoming, queueCommandSequences, type RealQueue } from './queue-model-commands.ts'
import { createRandom, QueueModel, shuffled } from './queue-reference-model.ts'

const PROPERTY_SEED = 0x1a_2b_3c_4d

afterEach(() => {
	vi.restoreAllMocks()
})

describe('QueueStore deterministic model', () => {
	it.each([
		{ start: -2, current: null, upcoming: [10, 20, 30] },
		{ start: -1, current: null, upcoming: [10, 20, 30] },
		{ start: 0, current: 10, upcoming: [20, 30] },
		{ start: 1, current: 20, upcoming: [30] },
		{ start: 2, current: 30, upcoming: [] },
		{ start: 99, current: 30, upcoming: [] },
	])('normalizes numeric source start $start', ({ start, current, upcoming }) => {
		let queue!: QueueStore
		const cleanup = $effect.root(() => {
			queue = new QueueStore()
		})

		try {
			queue.setSource([10, 20, 30], start)

			expect(queue.current?.trackId ?? null).toBe(current)
			expect(actualUpcoming(queue, 'source').map((entry) => entry.trackId)).toEqual(upcoming)
			expect(queue.origin).toBeNull()
		} finally {
			cleanup()
		}
	})

	it('starts a deterministic shuffled source at its first shuffled row', () => {
		const seed = 0x2a_4b_6c_8d
		const trackIds = [10, 20, 30, 40]
		vi.spyOn(Math, 'random').mockImplementation(createRandom(seed))
		let queue!: QueueStore
		const cleanup = $effect.root(() => {
			queue = new QueueStore()
		})

		try {
			queue.setSource(trackIds, 'shuffle')
			const actualOrder = [
				queue.current?.trackId,
				...actualUpcoming(queue, 'source').map((entry) => entry.trackId),
			]

			expect(actualOrder).toEqual(shuffled(trackIds, createRandom(seed)))
			expect(queue.shuffle).toBe(true)
		} finally {
			cleanup()
		}
	})

	it('matches the reference model for generated command sequences', () => {
		fc.assert(
			fc.property(queueCommandSequences, (commands) => {
				const randomSpy = vi.spyOn(Math, 'random')
				let queue!: QueueStore
				const cleanup = $effect.root(() => {
					queue = new QueueStore()
				})

				try {
					fc.modelRun<QueueModel, RealQueue, QueueModel>(
						() => ({
							model: new QueueModel(),
							real: {
								queue,
								setMathRandom: (implementation) =>
									randomSpy.mockImplementation(implementation),
							},
						}),
						commands,
					)
				} finally {
					cleanup()
					randomSpy.mockRestore()
				}
			}),
			{ seed: PROPERTY_SEED, numRuns: 50 },
		)
	})
})
