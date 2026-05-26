import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HTMLAudioEngine } from '../engine-html.svelte.ts'
import { makeGraph } from './test-utils.ts'

class MockAudio {
	src = ''
	currentTime = 0
	duration = 0
	playbackRate = 1
	preservesPitch = true

	onended: (() => void) | null = null
	ondurationchange: (() => void) | null = null
	ontimeupdate: (() => void) | null = null
	onloadedmetadata: (() => void) | null = null
	onerror: (() => void) | null = null

	play = vi.fn(() => Promise.resolve())
	pause = vi.fn()
}

let audioInstance = new MockAudio()

beforeEach(() => {
	vi.stubGlobal(
		'Audio',
		vi.fn(function MockAudioConstructor() {
			audioInstance = new MockAudio()
			return audioInstance
		}),
	)
	vi.stubGlobal('URL', {
		createObjectURL: vi.fn(() => 'blob:mock'),
		revokeObjectURL: vi.fn(),
	})
})

afterEach(() => {
	vi.restoreAllMocks()
	vi.unstubAllGlobals()
})

const makeOptions = (overrides: Record<string, unknown> = {}) => ({
	audioGraph: makeGraph(),
	trackId: 1,
	duration: 180,
	blob: new Blob(['audio']),
	signal: new AbortController().signal,
	playbackRate: 1,
	preservePitch: true,
	...overrides,
})

describe('HTMLAudioEngine', () => {
	describe('load()', () => {
		it('resolves when onloadedmetadata fires', async () => {
			const engine = new HTMLAudioEngine(makeOptions())
			const loadPromise = engine.load()

			audioInstance.onloadedmetadata?.()

			await expect(loadPromise).resolves.toBeUndefined()
		})

		it('rejects when onerror fires before onloadedmetadata', async () => {
			const engine = new HTMLAudioEngine(makeOptions())
			const loadPromise = engine.load()

			audioInstance.onerror?.()

			await expect(loadPromise).rejects.toThrow()
		})

		it('installs a runtime error handler after successful load', async () => {
			const engine = new HTMLAudioEngine(makeOptions())
			engine.onError = vi.fn()

			const loadPromise = engine.load()
			audioInstance.onloadedmetadata?.()
			await loadPromise

			audioInstance.onerror?.()
			expect(engine.onError).toHaveBeenCalledTimes(1)
		})

		it('sets playbackRate and preservesPitch on the audio element after load', async () => {
			const engine = new HTMLAudioEngine(makeOptions())
			const loadPromise = engine.load()
			audioInstance.onloadedmetadata?.()
			await loadPromise

			expect(audioInstance.playbackRate).toBe(1)
			expect(audioInstance.preservesPitch).toBe(true)
		})
	})

	describe('play()', () => {
		it('resumes the AudioContext before calling audio.play()', async () => {
			const graph = makeGraph()
			const engine = new HTMLAudioEngine({
				...makeOptions(),
				audioGraph: graph,
			})

			const loadPromise = engine.load()
			audioInstance.onloadedmetadata?.()
			await loadPromise

			await engine.play()

			expect(graph.resume).toHaveBeenCalled()
			expect(audioInstance.play).toHaveBeenCalled()
		})
	})

	describe('setPlaybackRate()', () => {
		it('updates audio element playbackRate and preservesPitch', async () => {
			const engine = new HTMLAudioEngine(makeOptions())

			const loadPromise = engine.load()
			audioInstance.onloadedmetadata?.()
			await loadPromise

			engine.setPlaybackRate(1.5, false)

			expect(audioInstance.playbackRate).toBe(1.5)
			expect(audioInstance.preservesPitch).toBe(false)
		})
	})

	describe('dispose()', () => {
		it('clears all event handlers', async () => {
			const engine = new HTMLAudioEngine(makeOptions())

			const loadPromise = engine.load()
			audioInstance.onloadedmetadata?.()
			await loadPromise

			engine.dispose()

			expect(audioInstance.onended).toBeNull()
			expect(audioInstance.ontimeupdate).toBeNull()
			expect(audioInstance.ondurationchange).toBeNull()
			expect(audioInstance.onerror).toBeNull()
		})

		it('revokes the object URL', async () => {
			const engine = new HTMLAudioEngine(makeOptions())

			const loadPromise = engine.load()
			audioInstance.onloadedmetadata?.()
			await loadPromise

			engine.dispose()

			expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
		})
	})
})
