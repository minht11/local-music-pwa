import { describe, expect, it, vi } from 'vitest'
import { persist } from '$lib/helpers/persist.svelte.ts'
import { EqualizerStore } from '$lib/stores/player/equalizer.svelte.ts'

vi.mock('$lib/helpers/persist.svelte.ts', () => ({
	persist: vi.fn(),
}))

type MockFilter = {
	connect: ReturnType<typeof vi.fn>
	type: BiquadFilterType
	frequency: { value: number }
	Q: { value: number }
	gain: { value: number }
}

interface MockAudioContext {
	state: AudioContextState
	destination: { connect: ReturnType<typeof vi.fn> }
	resume: ReturnType<typeof vi.fn>
	createBiquadFilter: ReturnType<typeof vi.fn>
	createMediaElementSource: ReturnType<typeof vi.fn>
}

const setupAudioContextMock = (state: AudioContextState = 'suspended') => {
	const instances: MockAudioContext[] = []
	const filters: MockFilter[] = []
	const makeSource = () => ({
		connect: vi.fn(),
	})

	class AudioContextMock implements MockAudioContext {
		state: AudioContextState = state
		destination = { connect: vi.fn() }

		resume = vi.fn().mockImplementation(() => {
			this.state = 'running'

			return Promise.resolve()
		})

		createBiquadFilter = vi.fn(() => {
			const filter: MockFilter = {
				connect: vi.fn(),
				type: 'peaking',
				frequency: { value: 0 },
				Q: { value: 0 },
				gain: { value: 0 },
			}
			filters.push(filter)
			return filter
		})

		createMediaElementSource = vi.fn(() => makeSource())

		constructor() {
			instances.push(this)
		}
	}

	vi.stubGlobal('AudioContext', AudioContextMock)

	return {
		AudioContextMock,
		instances,
		filters,
	}
}

describe('EqualizerStore', () => {
	it('does not create AudioContext in constructor and initializes lazily in resumeContext', async () => {
		const { instances, filters } = setupAudioContextMock('suspended')

		const store = new EqualizerStore({} as HTMLAudioElement)
		expect(instances).toHaveLength(0)
		expect(persist).toHaveBeenCalledWith('equalizer', store, [
			'enabled',
			'bands',
			'selectedPreset',
		])

		await store.resumeContext()

		expect(instances).toHaveLength(1)
		expect(instances[0]?.resume).toHaveBeenCalledTimes(1)
		expect(filters).toHaveLength(10)
	})

	it('reuses the same AudioContext and does not resume again once running', async () => {
		const { instances } = setupAudioContextMock('suspended')
		const store = new EqualizerStore({} as HTMLAudioElement)

		await store.resumeContext()
		await store.resumeContext()

		expect(instances).toHaveLength(1)
		expect(instances[0]?.resume).toHaveBeenCalledTimes(1)
	})

	it('does not call resume when context is already running', async () => {
		const { instances } = setupAudioContextMock('running')
		const store = new EqualizerStore({} as HTMLAudioElement)

		await store.resumeContext()

		expect(instances[0]?.resume).not.toHaveBeenCalled()
	})

	it('setBand updates one band and clears selectedPreset', () => {
		setupAudioContextMock('running')
		const store = new EqualizerStore({} as HTMLAudioElement)

		store.applyPreset('bassBoost')
		store.setBand(0, 7)

		expect(store.bands[0]).toBe(7)
		expect(store.selectedPreset).toBeNull()
	})

	it('applyPreset and reset update bands and selectedPreset', () => {
		setupAudioContextMock('running')
		const store = new EqualizerStore({} as HTMLAudioElement)

		store.applyPreset('trebleBoost')
		expect(store.selectedPreset).toBe('trebleBoost')
		expect(store.bands).toEqual([0, 0, 0, 0, 0, 0, 2, 4, 5, 6])

		store.reset()
		expect(store.selectedPreset).toBe('flat')
		expect(store.bands).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
	})
})
