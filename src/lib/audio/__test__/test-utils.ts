import { vi } from 'vitest'
import type { AudioGraph } from '../audio-graph.svelte.ts'

const makeGainNode = () => ({ connect: vi.fn(), disconnect: vi.fn() })
const makeSourceNode = () => ({ connect: vi.fn(), disconnect: vi.fn() })

export const makeGraph = () =>
	({
		context: {
			createGain: vi.fn(() => makeGainNode()),
			createMediaElementSource: vi.fn(() => makeSourceNode()),
		},
		inputNode: { connect: vi.fn() },
		resume: vi.fn(() => Promise.resolve()),
	}) as unknown as AudioGraph
