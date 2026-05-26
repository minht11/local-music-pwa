import { afterEach, describe, expect, it, vi } from 'vitest'
import { EQ_BANDS } from '$lib/audio/eq-bands.ts'
import { AudioGraph } from '../audio-graph.svelte.ts'

const makeFilter = () => ({
	type: 'peaking' as BiquadFilterType,
	frequency: { value: 0 },
	Q: { value: 0 },
	gain: { value: 0 },
	connect: vi.fn(),
})

const makeGainNode = () => ({
	gain: { value: 1 },
	connect: vi.fn(),
	disconnect: vi.fn(),
})

const stubAudioContext = () => {
	const filters: ReturnType<typeof makeFilter>[] = []
	const gainNodes: ReturnType<typeof makeGainNode>[] = []

	const ctx = {
		state: 'running' as AudioContextState,
		destination: {},
		currentTime: 0,
		createBiquadFilter: vi.fn(() => {
			const f = makeFilter()
			filters.push(f)
			return f
		}),
		createGain: vi.fn(() => {
			const g = makeGainNode()
			gainNodes.push(g)
			return g
		}),
		resume: vi.fn(() => Promise.resolve()),
		suspend: vi.fn(() => Promise.resolve()),
	}

	// Regular function so it works with `new AudioContext()`.
	// Returning an object from a constructor overrides the default `this`.
	vi.stubGlobal(
		'AudioContext',
		vi.fn(function MockAudioContext() {
			return ctx
		}),
	)

	return { ctx, filters, gainNodes }
}

afterEach(() => vi.restoreAllMocks())

describe('AudioGraph', () => {
	it('does not create AudioContext until context is first accessed', () => {
		const { ctx } = stubAudioContext()
		const AudioContextSpy = vi.fn(function MockAudioContext() {
			return ctx
		})
		vi.stubGlobal('AudioContext', AudioContextSpy)

		const graph = new AudioGraph()
		expect(AudioContextSpy).not.toHaveBeenCalled()

		graph.context
		expect(AudioContextSpy).toHaveBeenCalledTimes(1)
	})

	it('initialized is false before first access and true after', () => {
		stubAudioContext()
		const graph = new AudioGraph()
		expect(graph.initialized).toBe(false)
		graph.context
		expect(graph.initialized).toBe(true)
	})

	it('creates 10 peaking filters with frequencies matching EQ_BANDS', () => {
		const { filters } = stubAudioContext()
		const graph = new AudioGraph()
		graph.context

		expect(filters).toHaveLength(10)
		for (const [i, filter] of filters.entries()) {
			expect(filter.type).toBe('peaking')
			expect(filter.frequency.value).toBe(EQ_BANDS[i]?.frequency)
		}
	})

	it('chains filter nodes from inputNode through to volumeNode', () => {
		const { filters, gainNodes } = stubAudioContext()
		const graph = new AudioGraph()
		graph.context

		const inputNode = gainNodes[0]
		const volumeNode = gainNodes[1]

		expect(inputNode?.connect).toHaveBeenCalledWith(filters[0])
		for (let i = 0; i < filters.length - 1; i += 1) {
			expect(filters[i]?.connect).toHaveBeenCalledWith(filters[i + 1])
		}
		expect(filters.at(-1)?.connect).toHaveBeenCalledWith(volumeNode)
	})

	it('setVolume updates volumeNode gain when initialized', () => {
		const { gainNodes } = stubAudioContext()
		const graph = new AudioGraph()
		graph.context

		graph.setVolume(0.5)

		expect(gainNodes[1]?.gain.value).toBe(0.5)
	})

	it('setVolume does nothing when not yet initialized', () => {
		stubAudioContext()
		const graph = new AudioGraph()
		expect(() => graph.setVolume(0.5)).not.toThrow()
	})

	it('resume calls context.resume() when state is suspended', async () => {
		const { ctx } = stubAudioContext()
		ctx.state = 'suspended'
		const graph = new AudioGraph()
		graph.context

		await graph.resume()

		expect(ctx.resume).toHaveBeenCalledTimes(1)
	})

	it('resume skips context.resume() when already running', async () => {
		const { ctx } = stubAudioContext()
		ctx.state = 'running'
		const graph = new AudioGraph()
		graph.context

		await graph.resume()

		expect(ctx.resume).not.toHaveBeenCalled()
	})

	it('suspend calls context.suspend() when running', async () => {
		const { ctx } = stubAudioContext()
		ctx.state = 'running'
		const graph = new AudioGraph()
		graph.context

		await graph.suspend()

		expect(ctx.suspend).toHaveBeenCalledTimes(1)
	})

	it('suspend skips context.suspend() when already suspended', async () => {
		const { ctx } = stubAudioContext()
		ctx.state = 'suspended'
		const graph = new AudioGraph()
		graph.context

		await graph.suspend()

		expect(ctx.suspend).not.toHaveBeenCalled()
	})
})
