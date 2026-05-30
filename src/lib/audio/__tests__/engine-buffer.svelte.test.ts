import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { wait } from '$lib/helpers/utils/wait.ts'
import type { AudioGraph } from '../audio-graph.svelte.ts'
import { AudioBufferEngine, supportsBufferEngine } from '../engine-buffer.svelte.ts'

/**
 * The sink behavior is configurable per test. Default: hang (never yields) so
 * the scheduling loop doesn't interfere with unrelated assertions.
 */
const sinkBehavior = { mode: 'hang' as 'hang' | 'empty' }

const { MockInput, MockAudioBufferSink, mockCanDecodeAudio } = vi.hoisted(() => {
	class MockAudioBufferSink {
		buffers(): AsyncIterable<{ buffer: AudioBuffer; timestamp: number }> {
			const mode = sinkBehavior.mode
			return {
				[Symbol.asyncIterator]() {
					if (mode === 'hang') {
						return { next: () => new Promise<IteratorResult<never>>(() => {}) }
					}
					let done = false
					return {
						next: (): Promise<IteratorResult<never>> => {
							if (!done) {
								done = true
							}
							return Promise.resolve({ done: true, value: undefined as never })
						},
					}
				},
			}
		}
	}

	class MockInput {
		dispose = vi.fn()
	}

	const mockCanDecodeAudio = vi.fn<(codec: string) => Promise<boolean>>()

	return { MockAudioBufferSink, MockInput, mockCanDecodeAudio }
})

vi.mock('mediabunny', () => ({
	AudioBufferSink: MockAudioBufferSink,
	BlobSource: class {},
	Input: MockInput,
	canDecodeAudio: mockCanDecodeAudio,
	FLAC: 'flac',
	PCM_AUDIO_CODECS: ['pcm-s16'],
	InputDisposedError: class InputDisposedError extends Error {
		constructor() {
			super('disposed')
			this.name = 'InputDisposedError'
		}
	},
}))

vi.mock('$lib/helpers/utils/ua.ts', () => ({
	isSafari: vi.fn(() => false),
}))

const makeBufferGraph = () => {
	const gainNode = { connect: vi.fn(), disconnect: vi.fn() }
	const context = {
		createGain: vi.fn(() => gainNode),
		createBufferSource: vi.fn(() => ({
			connect: vi.fn(),
			start: vi.fn(),
			stop: vi.fn(),
			disconnect: vi.fn(),
			buffer: null,
			playbackRate: { value: 1 },
			addEventListener: vi.fn((event: string, cb: () => void) => {
				// Immediately fire 'ended' so scheduled sources are cleaned up
				if (event === 'ended') {
					cb()
				}
			}),
		})),
		currentTime: 0,
	}
	return {
		context,
		inputNode: { connect: vi.fn() },
		resume: vi.fn(() => Promise.resolve()),
		suspend: vi.fn(() => Promise.resolve()),
		gainNode,
	}
}

const makeEngine = (
	opts: {
		duration?: number
		playbackRate?: number
		scheduleAt?: number
		signal?: AbortSignal
	} = {},
) => {
	const controller = new AbortController()
	const graph = makeBufferGraph()
	const input = new MockInput()

	const engine = new AudioBufferEngine({
		audioGraph: graph as unknown as AudioGraph,
		duration: opts.duration ?? 180,
		input: input as never,
		audioTrack: {} as never,
		signal: opts.signal ?? controller.signal,
		playbackRate: opts.playbackRate ?? 1,
		preservePitch: true,
		scheduleAt: opts.scheduleAt,
	})

	return { engine, graph, controller, input }
}

describe('supportsBufferEngine', () => {
	beforeEach(() => {
		mockCanDecodeAudio.mockResolvedValue(true)
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it('returns false immediately when AudioDecoder is not available', () => {
		// In the test environment (happy-dom), AudioDecoder is not defined
		expect(supportsBufferEngine('flac')).toBe(false)
	})

	it('returns false synchronously for unsupported codecs regardless of environment', () => {
		// Even if AudioDecoder were available, mp3 is not in the supported list
		expect(supportsBufferEngine('mp3')).toBe(false)
		expect(supportsBufferEngine('aac')).toBe(false)
		expect(supportsBufferEngine('opus')).toBe(false)
	})
})

describe('AudioBufferEngine', () => {
	beforeEach(() => {
		sinkBehavior.mode = 'hang'
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('initial state', () => {
		it('currentTime starts at 0', () => {
			const { engine, controller } = makeEngine()
			expect(engine.currentTime).toBe(0)
			controller.abort()
		})

		it('ended starts as false', () => {
			const { engine, controller } = makeEngine()
			expect(engine.ended).toBe(false)
			controller.abort()
		})

		it('duration reflects the provided option', () => {
			const { engine, controller } = makeEngine({ duration: 240 })
			expect(engine.duration).toBe(240)
			controller.abort()
		})

		it('buffering is true on construction without scheduleAt (no pre-roll)', () => {
			const { engine, controller } = makeEngine()
			expect(engine.buffering).toBe(true)
			controller.abort()
		})

		it('buffering is false on construction with scheduleAt (gapless pre-roll)', () => {
			const { engine, controller } = makeEngine({ scheduleAt: 10 })
			expect(engine.buffering).toBe(false)
			controller.abort()
		})

		it('suspends graph on construction without scheduleAt', () => {
			const { graph, controller } = makeEngine()
			expect(graph.suspend).toHaveBeenCalled()
			controller.abort()
		})

		it('does not suspend graph on construction with scheduleAt', () => {
			const { graph, controller } = makeEngine({ scheduleAt: 10 })
			expect(graph.suspend).not.toHaveBeenCalled()
			controller.abort()
		})

		it('connects gainNode to graph inputNode', () => {
			const { graph, controller } = makeEngine()
			expect(graph.gainNode.connect).toHaveBeenCalledWith(graph.inputNode)
			controller.abort()
		})
	})

	describe('endTime', () => {
		it('is scheduleBase + duration / playbackRate at construction (ctx.currentTime=0)', () => {
			const { engine, controller } = makeEngine({ duration: 180, playbackRate: 1 })
			// scheduleBase = ctx.currentTime = 0, seekOffset = 0, rate = 1
			expect(engine.endTime).toBe(180)
			controller.abort()
		})

		it('accounts for playbackRate', () => {
			const { engine, controller } = makeEngine({ duration: 180, playbackRate: 2 })
			// 0 + (180 - 0) / 2 = 90
			expect(engine.endTime).toBe(90)
			controller.abort()
		})

		it('uses provided scheduleAt as the schedule base', () => {
			const { engine, controller } = makeEngine({ duration: 180, scheduleAt: 50 })
			// scheduleBase = 50, seekOffset = 0, rate = 1
			expect(engine.endTime).toBe(50 + 180)
			controller.abort()
		})

		it('updates after seek', () => {
			const { engine, controller } = makeEngine({ duration: 180 })
			engine.seek(60)
			// After seek(60): seekOffset = 60, scheduleBase = ctx.currentTime = 0
			expect(engine.endTime).toBe(120)
			controller.abort()
		})
	})

	describe('seek()', () => {
		it('updates currentTime immediately', () => {
			const { engine, controller } = makeEngine()

			engine.seek(42)

			expect(engine.currentTime).toBe(42)
			controller.abort()
		})

		it('clears ended state when seeking away from the end', () => {
			const { engine, controller } = makeEngine({ duration: 10 })

			// Seek to near-end while paused → marks ended
			engine.seek(9.7)
			expect(engine.ended).toBe(true)

			// Seek to the middle → clears ended (via #startFrom)
			engine.seek(5)
			expect(engine.ended).toBe(false)
			controller.abort()
		})

		it('marks ended when seeking to within threshold of end while paused', () => {
			const { engine, controller } = makeEngine({ duration: 10 })
			// SEEK_END_THRESHOLD_SECONDS = 0.5; 9.6 >= 10 - 0.5 = 9.5
			engine.seek(9.6)
			expect(engine.ended).toBe(true)
			controller.abort()
		})

		it('does NOT mark ended when seeking near end while playing', () => {
			const { engine, controller } = makeEngine({ duration: 10 })

			void engine.play()
			engine.seek(9.6)

			expect(engine.ended).toBe(false)
			controller.abort()
		})
	})

	describe('pause()', () => {
		it('suspends the graph', () => {
			const { engine, graph, controller } = makeEngine()
			// Initial construction already calls suspend once
			const callsBefore = graph.suspend.mock.calls.length

			engine.pause()

			expect(graph.suspend.mock.calls.length).toBeGreaterThan(callsBefore)
			controller.abort()
		})
	})

	describe('play()', () => {
		it('resumes the graph when not buffering', async () => {
			// scheduleAt means gapless pre-roll: buffering starts false so play() proceeds
			const { engine, graph, controller } = makeEngine({ scheduleAt: 10 })

			await engine.play()

			expect(graph.resume).toHaveBeenCalled()
			controller.abort()
		})

		it('returns immediately (without resuming graph) while still buffering', async () => {
			const { engine, graph, controller } = makeEngine()
			expect(engine.buffering).toBe(true)

			await engine.play()

			expect(graph.resume).not.toHaveBeenCalled()
			controller.abort()
		})
	})

	describe('setPlaybackRate()', () => {
		it('updates endTime to reflect the new rate', () => {
			const { engine, controller } = makeEngine({ duration: 180 })

			engine.setPlaybackRate(2, false)

			// After rate change to 2x from position 0: endTime = 0 + 180 / 2 = 90
			expect(engine.endTime).toBe(90)
			controller.abort()
		})
	})

	describe('onEnded callback', () => {
		it('fires when the scheduling loop completes with no buffers', async () => {
			sinkBehavior.mode = 'empty'
			const { engine, controller } = makeEngine()
			const onEnded = vi.fn()
			engine.onEnded = onEnded

			// Let the empty scheduling loop run to completion
			await wait(0)

			expect(onEnded).toHaveBeenCalled()
			controller.abort()
		})
	})

	describe('disposal (abort signal)', () => {
		it('disconnects gainNode from graph when aborted', () => {
			const { graph, controller } = makeEngine()

			controller.abort()

			expect(graph.gainNode.disconnect).toHaveBeenCalled()
		})

		it('disposes the mediabunny Input', () => {
			const { input, controller } = makeEngine()

			controller.abort()

			expect(input.dispose).toHaveBeenCalled()
		})
	})
})
