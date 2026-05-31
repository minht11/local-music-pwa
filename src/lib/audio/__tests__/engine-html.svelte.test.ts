import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHTMLAudioEngine, HTMLAudioEngine } from '../engine-html.svelte.ts'
import { makeGraph } from './test-utils.ts'

interface MockNode {
	mock: { results: Array<{ value: { disconnect: ReturnType<typeof vi.fn> } }> }
}

class MockAudio extends EventTarget {
	src = ''
	currentTime = 0
	duration = Number.NaN
	ended = false
	paused = true
	playbackRate = 1
	preservesPitch = true

	onloadedmetadata: (() => void) | null = null
	onerror: (() => void) | null = null

	play = vi.fn(() => {
		this.paused = false
		return Promise.resolve()
	})
	pause = vi.fn(() => {
		this.paused = true
	})
}

let mockAudio!: MockAudio

beforeEach(() => {
	vi.stubGlobal(
		'Audio',
		class extends MockAudio {
			constructor() {
				super()
				mockAudio = this
			}
		},
	)
	vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
	vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})

afterEach(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
	vi.clearAllMocks()
})

const makeEngine = async (
	opts: {
		playbackRate?: number
		preservePitch?: boolean
		duration?: number
		signal?: AbortSignal
	} = {},
) => {
	const graph = makeGraph()
	const controller = new AbortController()

	const promise = createHTMLAudioEngine({
		audioGraph: graph,
		blob: new Blob(['audio']),
		signal: opts.signal ?? controller.signal,
		playbackRate: opts.playbackRate ?? 1,
		preservePitch: opts.preservePitch ?? true,
		duration: opts.duration ?? 180,
	})

	// loadAudio sets onloadedmetadata synchronously before awaiting — trigger it now
	mockAudio.duration = opts.duration ?? 180
	mockAudio.onloadedmetadata?.()

	const engine = await promise
	return { engine, graph, controller }
}

describe('createHTMLAudioEngine', () => {
	it('resolves with an HTMLAudioEngine when metadata loads', async () => {
		const { engine } = await makeEngine()
		expect(engine).toBeInstanceOf(HTMLAudioEngine)
	})

	it('creates a blob URL from the provided blob', async () => {
		await makeEngine()
		expect(URL.createObjectURL).toHaveBeenCalled()
	})

	it('sets playbackRate on the audio element before loading', async () => {
		await makeEngine({ playbackRate: 1.5 })
		expect(mockAudio.playbackRate).toBe(1.5)
	})

	it('sets preservesPitch on the audio element before loading', async () => {
		await makeEngine({ preservePitch: false })
		expect(mockAudio.preservesPitch).toBe(false)
	})

	it('rejects when the audio element errors during load', async () => {
		const graph = makeGraph()
		const controller = new AbortController()

		const promise = createHTMLAudioEngine({
			audioGraph: graph,
			blob: new Blob(['audio']),
			signal: controller.signal,
			playbackRate: 1,
			preservePitch: true,
			duration: 180,
		})

		mockAudio.onerror?.()

		await expect(promise).rejects.toThrow()
	})

	it('rejects with an AbortError when the signal is aborted before metadata loads', async () => {
		const graph = makeGraph()
		const controller = new AbortController()

		const promise = createHTMLAudioEngine({
			audioGraph: graph,
			blob: new Blob(['audio']),
			signal: controller.signal,
			playbackRate: 1,
			preservePitch: true,
			duration: 180,
		})

		controller.abort()

		await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
	})
})

describe('HTMLAudioEngine', () => {
	describe('properties', () => {
		it('duration is taken from audio.duration at construction time', async () => {
			const { engine } = await makeEngine({ duration: 300 })
			expect(engine.duration).toBe(300)
		})

		it('buffering is always false', async () => {
			const { engine } = await makeEngine()
			expect(engine.buffering).toBe(false)
		})

		it('ended reflects audio.ended', async () => {
			const { engine } = await makeEngine()
			expect(engine.ended).toBe(false)

			mockAudio.ended = true
			expect(engine.ended).toBe(true)
		})

		it('currentTime updates on the first timeupdate event', async () => {
			const { engine } = await makeEngine()

			mockAudio.currentTime = 30
			mockAudio.dispatchEvent(new Event('timeupdate'))

			expect(engine.currentTime).toBe(30)
		})

		it('throttles timeupdate: subsequent events within the window are suppressed', async () => {
			vi.useFakeTimers()
			const { engine } = await makeEngine()

			mockAudio.currentTime = 10
			mockAudio.dispatchEvent(new Event('timeupdate'))
			expect(engine.currentTime).toBe(10)

			// Second event within the 250ms throttle window — suppressed
			mockAudio.currentTime = 20
			mockAudio.dispatchEvent(new Event('timeupdate'))
			expect(engine.currentTime).toBe(10)

			vi.advanceTimersByTime(250)

			// After window expires the next event goes through
			mockAudio.currentTime = 30
			mockAudio.dispatchEvent(new Event('timeupdate'))
			expect(engine.currentTime).toBe(30)

			vi.useRealTimers()
		})
	})

	describe('play()', () => {
		it('resumes graph and calls audio.play()', async () => {
			const { engine, graph } = await makeEngine()

			await engine.play()

			expect(graph.resume).toHaveBeenCalled()
			expect(mockAudio.play).toHaveBeenCalled()
		})
	})

	describe('pause()', () => {
		it('calls audio.pause()', async () => {
			const { engine } = await makeEngine()
			await engine.play()

			engine.pause()

			expect(mockAudio.pause).toHaveBeenCalled()
		})
	})

	describe('seek()', () => {
		it('updates engine.currentTime immediately', async () => {
			const { engine } = await makeEngine()

			engine.seek(42)

			expect(engine.currentTime).toBe(42)
		})

		it('sets audio.currentTime', async () => {
			const { engine } = await makeEngine()

			engine.seek(42)

			expect(mockAudio.currentTime).toBe(42)
		})
	})

	describe('setPlaybackRate()', () => {
		it('updates audio.playbackRate and preservesPitch', async () => {
			const { engine } = await makeEngine()

			engine.setPlaybackRate(1.5, false)

			expect(mockAudio.playbackRate).toBe(1.5)
			expect(mockAudio.preservesPitch).toBe(false)
		})
	})

	describe('callbacks', () => {
		it('fires onEnded when audio ended event dispatches', async () => {
			const { engine } = await makeEngine()
			const onEnded = vi.fn()
			engine.onEnded = onEnded

			mockAudio.dispatchEvent(new Event('ended'))

			expect(onEnded).toHaveBeenCalledOnce()
		})

		it('fires onError when audio error event dispatches', async () => {
			const { engine } = await makeEngine()
			const onError = vi.fn()
			engine.onError = onError

			mockAudio.dispatchEvent(new Event('error'))

			expect(onError).toHaveBeenCalledOnce()
		})

		it('stops firing callbacks after the signal is aborted', async () => {
			const { engine, controller } = await makeEngine()
			const onEnded = vi.fn()
			const onError = vi.fn()
			engine.onEnded = onEnded
			engine.onError = onError

			controller.abort()

			mockAudio.dispatchEvent(new Event('ended'))
			mockAudio.dispatchEvent(new Event('error'))

			expect(onEnded).not.toHaveBeenCalled()
			expect(onError).not.toHaveBeenCalled()
		})
	})

	describe('disposal (abort signal)', () => {
		it('pauses the audio element', async () => {
			const { controller } = await makeEngine()

			controller.abort()

			expect(mockAudio.pause).toHaveBeenCalled()
		})

		it('clears audio src and revokes the blob URL', async () => {
			const { controller } = await makeEngine()

			controller.abort()

			expect(mockAudio.src).toBe('')
			expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
		})

		it('disconnects graph nodes', async () => {
			const { controller, graph } = await makeEngine()

			// Nodes are created during engine construction — access from mock call history
			const gainNode = (graph.context.createGain as unknown as MockNode).mock.results[0]
				?.value
			const sourceNode = (graph.context.createMediaElementSource as unknown as MockNode).mock
				.results[0]?.value

			controller.abort()

			expect(gainNode?.disconnect).toHaveBeenCalled()
			expect(sourceNode?.disconnect).toHaveBeenCalled()
		})
	})
})
