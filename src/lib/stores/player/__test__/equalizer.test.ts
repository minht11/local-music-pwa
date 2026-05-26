import { afterEach, describe, expect, it, vi } from 'vitest'
import { EqualizerStore } from '$lib/stores/player/equalizer.svelte.ts'

vi.mock('$lib/helpers/persist.svelte.ts', () => ({
	persist: vi.fn(),
}))

const makeGraph = (opts: { initialized?: boolean } = {}) => {
	const filters = Array.from({ length: 10 }, () => ({ gain: { value: 0 } }))
	return {
		initialized: opts.initialized ?? false,
		filters,
	}
}

afterEach(() => vi.clearAllMocks())

describe('EqualizerStore', () => {
	describe('setBand', () => {
		it('updates the target band value', () => {
			const store = new EqualizerStore(makeGraph() as never)
			store.setBand(3, 6)
			expect(store.bands[3]).toBe(6)
		})

		it('clears selectedPreset', () => {
			const store = new EqualizerStore(makeGraph() as never)
			store.applyPreset('rock')
			store.setBand(0, 9)
			expect(store.selectedPreset).toBeNull()
		})
	})

	describe('applyPreset', () => {
		it('sets bands to the preset gains', () => {
			const store = new EqualizerStore(makeGraph() as never)
			store.applyPreset('trebleBoost')
			expect(store.bands).toEqual([0, 0, 0, 0, 0, 0, 2, 4, 5, 6])
		})

		it('sets selectedPreset to the preset name', () => {
			const store = new EqualizerStore(makeGraph() as never)
			store.applyPreset('rock')
			expect(store.selectedPreset).toBe('rock')
		})
	})

	describe('reset', () => {
		it('applies the flat preset with all zeros', () => {
			const store = new EqualizerStore(makeGraph() as never)
			store.applyPreset('rock')
			store.reset()
			expect(store.bands).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
			expect(store.selectedPreset).toBe('flat')
		})
	})
})
