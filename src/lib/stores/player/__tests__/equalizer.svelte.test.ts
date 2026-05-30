import { flushSync } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EqualizerStore } from '$lib/stores/player/equalizer.svelte.ts'

vi.mock('$lib/helpers/persist.svelte.ts', () => ({
	persist: vi.fn(),
}))

// Graph with an uninitialized AudioContext — the filter effect is a no-op.
const makeGraph = () => ({
	initialized: false,
	filters: Array.from({ length: 10 }, () => ({ gain: { value: 0 } })),
	context: { currentTime: 0 },
})

// Graph with an initialized AudioContext — the filter effect runs and calls setTargetAtTime.
const makeInitializedGraph = () => ({
	initialized: true,
	filters: Array.from({ length: 10 }, () => ({
		gain: { value: 0, setTargetAtTime: vi.fn() },
	})),
	context: { currentTime: 0 },
})

let store!: EqualizerStore
let cleanup: () => void

beforeEach(() => {
	cleanup = $effect.root(() => {
		store = new EqualizerStore(makeGraph() as never)
	})
})

afterEach(() => {
	cleanup()
	vi.clearAllMocks()
})

describe('EqualizerStore', () => {
	describe('setBand', () => {
		it('updates the target band value', () => {
			store.setBand(3, 6)
			expect(store.bands[3]).toBe(6)
		})

		it('clears selectedPreset', () => {
			store.applyPreset('rock')
			store.setBand(0, 9)
			expect(store.selectedPreset).toBeNull()
		})
	})

	describe('applyPreset', () => {
		it('sets bands to the preset gains', () => {
			store.applyPreset('trebleBoost')
			expect(store.bands).toEqual([0, 0, 0, 0, 0, 0, 2, 4, 5, 6])
		})

		it('sets selectedPreset to the preset name', () => {
			store.applyPreset('rock')
			expect(store.selectedPreset).toBe('rock')
		})
	})

	describe('reset', () => {
		it('applies the flat preset with all zeros', () => {
			store.applyPreset('rock')
			store.reset()
			expect(store.bands).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
			expect(store.selectedPreset).toBe('flat')
		})
	})

	describe('filter sync (graph initialized)', () => {
		it('sets all filter gains to 0 when disabled', () => {
			const graph = makeInitializedGraph()
			const innerCleanup = $effect.root(() => {
				new EqualizerStore(graph as never)
			})
			flushSync()

			for (const filter of graph.filters) {
				expect(filter.gain.setTargetAtTime).toHaveBeenCalledWith(0, 0, 0.015)
			}

			innerCleanup()
		})

		it('applies band gains to filters when enabled', () => {
			const graph = makeInitializedGraph()
			const innerCleanup = $effect.root(() => {
				const eq = new EqualizerStore(graph as never)
				eq.enabled = true
				eq.applyPreset('bassBoost')
			})
			flushSync()

			// bassBoost: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0]
			expect(graph.filters[0]?.gain.setTargetAtTime).toHaveBeenLastCalledWith(6, 0, 0.015)
			expect(graph.filters[1]?.gain.setTargetAtTime).toHaveBeenLastCalledWith(5, 0, 0.015)
			expect(graph.filters[4]?.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 0, 0.015)

			innerCleanup()
		})

		it('resets all filter gains to 0 when disabled after being enabled', () => {
			const graph = makeInitializedGraph()
			let eqStore!: EqualizerStore
			const innerCleanup = $effect.root(() => {
				eqStore = new EqualizerStore(graph as never)
				eqStore.enabled = true
				eqStore.applyPreset('bassBoost')
			})
			flushSync()

			eqStore.enabled = false
			flushSync()

			for (const filter of graph.filters) {
				expect(filter.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 0, 0.015)
			}

			innerCleanup()
		})
	})
})
