import { flushSync } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FileLoadFailReason } from '$lib/helpers/file-resolver.ts'
import { PlaybackController, type TrackLoader } from '../playback-controller.svelte.ts'
import { makeGraph } from './test-utils.ts'

// Must be hoisted so the vi.mock factories can reference them
const {
	MockAudioBufferEngine,
	mockSupportsBufferEngine,
	mockCreateAudioBufferEngine,
	mockCreateHTMLAudioEngine,
} = vi.hoisted(() => {
	class MockAudioBufferEngine {
		currentTime = 0
		duration = 180
		buffering = false
		endTime = 999
		#ended = false

		get ended() {
			return this.#ended
		}
		set ended(v: boolean) {
			this.#ended = v
		}

		onEnded: (() => void) | null = null
		onError: (() => void) | null = null

		play = vi.fn(() => Promise.resolve())
		pause = vi.fn()
		seek = vi.fn((time: number) => {
			this.currentTime = time
		})
		setPlaybackRate = vi.fn()
	}

	return {
		MockAudioBufferEngine,
		mockSupportsBufferEngine: vi.fn<(codec: string) => boolean | Promise<boolean>>(),
		mockCreateAudioBufferEngine: vi.fn(),
		mockCreateHTMLAudioEngine: vi.fn(),
	}
})

vi.mock('../engine-buffer.svelte.ts', () => ({
	AudioBufferEngine: MockAudioBufferEngine,
	supportsBufferEngine: mockSupportsBufferEngine,
	createAudioBufferEngine: mockCreateAudioBufferEngine,
}))

vi.mock('../engine-html.svelte.ts', () => ({
	createHTMLAudioEngine: mockCreateHTMLAudioEngine,
}))

const makeHTMLEngine = () => {
	const engine = {
		currentTime: 0,
		duration: 180,
		buffering: false as const,
		ended: false,
		onEnded: null as (() => void) | null,
		onError: null as (() => void) | null,
		play: vi.fn(() => Promise.resolve()),
		pause: vi.fn(),
		seek: vi.fn((time: number) => {
			engine.currentTime = time
		}),
		setPlaybackRate: vi.fn(),
	}
	return engine
}

const makeBufferEngine = (opts: { duration?: number; endTime?: number } = {}) => {
	const engine = new MockAudioBufferEngine()
	if (opts.duration !== undefined) {
		engine.duration = opts.duration
	}
	if (opts.endTime !== undefined) {
		engine.endTime = opts.endTime
	}
	return engine
}

type TrackLoaderResult = Awaited<ReturnType<TrackLoader>>

const makeLoadedResult = (id: number, codec = 'mp3', duration = 180): TrackLoaderResult => ({
	status: 'loaded',
	file: new File(['audio'], `track-${id}.mp3`, { type: 'audio/mpeg' }),
	codec,
	duration,
})

const setup = (opts: { gaplessEnabled?: boolean } = {}) => {
	const graph = makeGraph()
	const onTrackEnded = vi.fn()
	const onError = vi.fn<(reason: FileLoadFailReason) => void>()
	const trackLoader = vi.fn<TrackLoader>()
	const isGaplessEnabled = vi.fn(() => opts.gaplessEnabled ?? false)

	let controller!: PlaybackController
	const cleanup = $effect.root(() => {
		controller = new PlaybackController(graph, {
			trackLoader,
			onTrackEnded,
			onError,
			isGaplessEnabled,
		})
	})

	const seedTrack = (id: number, codec = 'mp3', duration = 180) => {
		trackLoader.mockResolvedValue(makeLoadedResult(id, codec, duration))
	}

	return {
		controller,
		onTrackEnded,
		onError,
		trackLoader,
		isGaplessEnabled,
		seedTrack,
		[Symbol.dispose]: cleanup,
	}
}

describe('PlaybackController', () => {
	beforeEach(() => {
		mockSupportsBufferEngine.mockReturnValue(false)
		mockCreateHTMLAudioEngine.mockImplementation(() => Promise.resolve(makeHTMLEngine()))
		mockCreateAudioBufferEngine.mockImplementation(() => Promise.resolve(makeBufferEngine()))
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('play()', () => {
		it('sets playing=true and calls engine.play()', async () => {
			using s = setup()
			const engine = makeHTMLEngine()
			mockCreateHTMLAudioEngine.mockResolvedValue(engine)
			s.seedTrack(1)

			await s.controller.play(1)

			expect(s.controller.playing).toBe(true)
			expect(engine.play).toHaveBeenCalled()
		})

		it('sets duration from loaded engine', async () => {
			using s = setup()
			const engine = makeHTMLEngine()
			engine.duration = 240
			mockCreateHTMLAudioEngine.mockResolvedValue(engine)
			s.seedTrack(1, 'mp3', 240)

			await s.controller.play(1)

			expect(s.controller.duration).toBe(240)
		})

		it('reuses engine without reloading when same trackId is already ready', async () => {
			using s = setup()
			const engine = makeHTMLEngine()
			mockCreateHTMLAudioEngine.mockResolvedValue(engine)
			s.seedTrack(1)

			await s.controller.play(1)
			await s.controller.play(1)

			expect(s.trackLoader).toHaveBeenCalledTimes(1)
			expect(engine.play).toHaveBeenCalledTimes(2)
		})

		it('does not start a second load when same trackId is already loading', async () => {
			using s = setup()
			s.seedTrack(1)

			const p1 = s.controller.play(1)
			const p2 = s.controller.play(1)
			await Promise.all([p1, p2])

			expect(s.trackLoader).toHaveBeenCalledTimes(1)
		})

		it('replaces current track when switching to a different trackId', async () => {
			using s = setup()
			const engine1 = makeHTMLEngine()
			const engine2 = makeHTMLEngine()
			mockCreateHTMLAudioEngine.mockResolvedValueOnce(engine1).mockResolvedValueOnce(engine2)
			s.seedTrack(1)

			await s.controller.play(1)
			s.seedTrack(2)
			await s.controller.play(2)

			expect(engine2.play).toHaveBeenCalled()
		})

		it('seeks to 0 before playing when fromBeginning is true and track is ready', async () => {
			using s = setup()
			const engine = makeHTMLEngine()
			mockCreateHTMLAudioEngine.mockResolvedValue(engine)
			s.seedTrack(1)

			await s.controller.play(1)
			await s.controller.play(1, { fromBeginning: true })

			expect(engine.seek).toHaveBeenCalledWith(0)
		})

		it('seeks to 0 when re-playing a track that already ended', async () => {
			using s = setup()
			const engine = makeHTMLEngine()
			engine.ended = true
			mockCreateHTMLAudioEngine.mockResolvedValue(engine)
			s.seedTrack(1)

			await s.controller.play(1)
			await s.controller.play(1)

			expect(engine.seek).toHaveBeenCalledWith(0)
		})

		it('sets playing=false and calls onError when track fails to load', async () => {
			using s = setup()
			s.trackLoader.mockResolvedValue({ status: 'not-found' })

			await s.controller.play(1)

			expect(s.controller.playing).toBe(false)
			expect(s.onError).toHaveBeenCalledWith('not-found')
		})

		it('promotes preloaded gapless next when play() is called with gapless:true', async () => {
			using s = setup({ gaplessEnabled: true })
			mockSupportsBufferEngine.mockReturnValue(true)

			const engine1 = makeBufferEngine()
			const engine2 = makeBufferEngine()
			mockCreateAudioBufferEngine
				.mockResolvedValueOnce(engine1)
				.mockResolvedValueOnce(engine2)

			s.seedTrack(1, 'flac')
			await s.controller.play(1)

			s.seedTrack(2, 'flac')
			await s.controller.preloadNext(2)

			// play(2, gapless) should promote the preloaded engine2
			await s.controller.play(2, { gapless: true })

			expect(engine2.play).toHaveBeenCalled()
			// engine1 only played for track 1, no second load happened for track 2
			expect(mockCreateAudioBufferEngine).toHaveBeenCalledTimes(2)
		})

		it('passes current playbackRate to newly loaded engine', async () => {
			using s = setup()
			s.controller.setPlaybackRate(1.5, false)
			s.seedTrack(1)

			await s.controller.play(1)

			expect(mockCreateHTMLAudioEngine).toHaveBeenCalledWith(
				expect.objectContaining({ playbackRate: 1.5, preservePitch: false }),
			)
		})
	})

	describe('pause()', () => {
		it('sets playing=false', async () => {
			using s = setup()
			mockCreateHTMLAudioEngine.mockResolvedValue(makeHTMLEngine())
			s.seedTrack(1)
			await s.controller.play(1)

			s.controller.pause()

			expect(s.controller.playing).toBe(false)
		})

		it('calls engine.pause() when track is ready', async () => {
			using s = setup()
			const engine = makeHTMLEngine()
			mockCreateHTMLAudioEngine.mockResolvedValue(engine)
			s.seedTrack(1)
			await s.controller.play(1)

			s.controller.pause()

			expect(engine.pause).toHaveBeenCalled()
		})

		it('does not throw when no track is loaded', () => {
			using s = setup()

			expect(() => s.controller.pause()).not.toThrow()
		})
	})

	describe('seek()', () => {
		it('optimistically updates currentTime immediately', async () => {
			using s = setup()
			mockCreateHTMLAudioEngine.mockResolvedValue(makeHTMLEngine())
			s.seedTrack(1)
			await s.controller.play(1)

			s.controller.seek(42)

			expect(s.controller.currentTime).toBe(42)
		})

		it('calls engine.seek() with the given time', async () => {
			using s = setup()
			const engine = makeHTMLEngine()
			mockCreateHTMLAudioEngine.mockResolvedValue(engine)
			s.seedTrack(1)
			await s.controller.play(1)

			s.controller.seek(30)

			expect(engine.seek).toHaveBeenCalledWith(30)
		})

		it('aborts any preloaded next track', async () => {
			using s = setup({ gaplessEnabled: true })
			mockSupportsBufferEngine.mockReturnValue(true)

			const engine1 = makeBufferEngine()
			const engine2 = makeBufferEngine()
			const engine3 = makeBufferEngine()
			mockCreateAudioBufferEngine
				.mockResolvedValueOnce(engine1)
				.mockResolvedValueOnce(engine2)
				.mockResolvedValueOnce(engine3)

			s.seedTrack(1, 'flac')
			await s.controller.play(1)

			s.seedTrack(2, 'flac')
			await s.controller.preloadNext(2)

			s.controller.seek(10)

			// play(2, gapless) after seek should load fresh since preload was aborted
			s.seedTrack(2, 'flac')
			await s.controller.play(2, { gapless: true })

			expect(mockCreateAudioBufferEngine).toHaveBeenCalledTimes(3)
		})

		it('does not throw when no track is loaded', () => {
			using s = setup()

			expect(() => s.controller.seek(10)).not.toThrow()
		})
	})

	describe('abort()', () => {
		it('resets playing and duration', async () => {
			using s = setup()
			const engine = makeHTMLEngine()
			engine.duration = 200
			mockCreateHTMLAudioEngine.mockResolvedValue(engine)
			s.seedTrack(1, 'mp3', 200)
			await s.controller.play(1)

			s.controller.abort()

			expect(s.controller.playing).toBe(false)
			expect(s.controller.duration).toBe(0)
		})

		it('aborts an in-progress load without calling onError', async () => {
			using s = setup()
			let resolveLoad!: (v: TrackLoaderResult) => void
			s.trackLoader.mockReturnValue(new Promise((r) => (resolveLoad = r)))

			void s.controller.play(1)
			s.controller.abort()

			// Resolve after abort — should be silently ignored
			resolveLoad(makeLoadedResult(1))
			await Promise.resolve()

			expect(s.onError).not.toHaveBeenCalled()
		})

		it('currentTime returns 0 after abort', async () => {
			using s = setup()
			mockCreateHTMLAudioEngine.mockResolvedValue(makeHTMLEngine())
			s.seedTrack(1)
			await s.controller.play(1)

			s.controller.abort()

			expect(s.controller.currentTime).toBe(0)
		})
	})

	describe('preloadNext()', () => {
		it('marks gapless unavailable when current engine is HTML (not buffer engine)', async () => {
			using s = setup({ gaplessEnabled: true })
			// mp3 → supportsBufferEngine returns false → HTML engine is used
			s.seedTrack(1, 'mp3')
			await s.controller.play(1)

			await s.controller.preloadNext(2)

			// A second buffer engine load should not have been attempted
			expect(mockCreateAudioBufferEngine).not.toHaveBeenCalled()
		})

		it('marks gapless unavailable when gapless is disabled even with buffer engine', async () => {
			using s = setup({ gaplessEnabled: false })
			mockSupportsBufferEngine.mockReturnValue(true)

			// With gapless disabled, play() always uses the HTML engine
			s.seedTrack(1, 'flac')
			await s.controller.play(1)

			await s.controller.preloadNext(2)

			// Neither play nor preload should reach the buffer engine path
			expect(mockCreateAudioBufferEngine).not.toHaveBeenCalled()
		})

		it('does not preload the currently-playing track as next', async () => {
			using s = setup({ gaplessEnabled: true })
			mockSupportsBufferEngine.mockReturnValue(true)
			mockCreateAudioBufferEngine.mockResolvedValue(makeBufferEngine())

			s.seedTrack(1, 'flac')
			await s.controller.play(1)

			await s.controller.preloadNext(1)

			// No additional load for the same trackId
			expect(mockCreateAudioBufferEngine).toHaveBeenCalledTimes(1)
		})

		it('is idempotent: same non-idle trackId does not trigger a second load', async () => {
			using s = setup({ gaplessEnabled: true })
			mockSupportsBufferEngine.mockReturnValue(true)
			mockCreateAudioBufferEngine
				.mockResolvedValueOnce(makeBufferEngine())
				.mockResolvedValueOnce(makeBufferEngine())

			s.seedTrack(1, 'flac')
			await s.controller.play(1)

			s.seedTrack(2, 'flac')
			await s.controller.preloadNext(2)
			await s.controller.preloadNext(2) // second call, same trackId

			expect(mockCreateAudioBufferEngine).toHaveBeenCalledTimes(2) // play + one preload
		})

		it('preloads with scheduleAt from current engine endTime', async () => {
			using s = setup({ gaplessEnabled: true })
			mockSupportsBufferEngine.mockReturnValue(true)

			const engine1 = makeBufferEngine()
			engine1.endTime = 123.45
			mockCreateAudioBufferEngine
				.mockResolvedValueOnce(engine1)
				.mockResolvedValueOnce(makeBufferEngine())

			s.seedTrack(1, 'flac')
			await s.controller.play(1)

			s.seedTrack(2, 'flac')
			await s.controller.preloadNext(2)

			expect(mockCreateAudioBufferEngine).toHaveBeenLastCalledWith(
				expect.objectContaining({ scheduleAt: 123.45 }),
			)
		})
	})

	describe('abortNext()', () => {
		it('cancels preloaded next so play() performs a fresh load', async () => {
			using s = setup({ gaplessEnabled: true })
			mockSupportsBufferEngine.mockReturnValue(true)
			const engine1 = makeBufferEngine()
			const engine2 = makeBufferEngine()
			const engine3 = makeBufferEngine()
			mockCreateAudioBufferEngine
				.mockResolvedValueOnce(engine1)
				.mockResolvedValueOnce(engine2)
				.mockResolvedValueOnce(engine3)

			s.seedTrack(1, 'flac')
			await s.controller.play(1)

			s.seedTrack(2, 'flac')
			await s.controller.preloadNext(2)

			s.controller.abortNext()

			s.seedTrack(2, 'flac')
			await s.controller.play(2, { gapless: true })

			expect(engine3.play).toHaveBeenCalled()
			expect(mockCreateAudioBufferEngine).toHaveBeenCalledTimes(3)
		})
	})

	describe('setPlaybackRate()', () => {
		it('calls engine.setPlaybackRate() when track is ready', async () => {
			using s = setup()
			const engine = makeHTMLEngine()
			mockCreateHTMLAudioEngine.mockResolvedValue(engine)
			s.seedTrack(1)
			await s.controller.play(1)

			s.controller.setPlaybackRate(1.5, false)

			expect(engine.setPlaybackRate).toHaveBeenCalledWith(1.5, false)
		})

		it('applies the new rate to subsequent engine loads', async () => {
			using s = setup()
			s.controller.setPlaybackRate(2.0, false)
			s.seedTrack(1)

			await s.controller.play(1)

			expect(mockCreateHTMLAudioEngine).toHaveBeenCalledWith(
				expect.objectContaining({ playbackRate: 2.0, preservePitch: false }),
			)
		})

		it('cancels any preloaded next track', async () => {
			using s = setup({ gaplessEnabled: true })
			mockSupportsBufferEngine.mockReturnValue(true)
			const engine1 = makeBufferEngine()
			const engine2 = makeBufferEngine()
			const engine3 = makeBufferEngine()
			mockCreateAudioBufferEngine
				.mockResolvedValueOnce(engine1)
				.mockResolvedValueOnce(engine2)
				.mockResolvedValueOnce(engine3)

			s.seedTrack(1, 'flac')
			await s.controller.play(1)

			s.seedTrack(2, 'flac')
			await s.controller.preloadNext(2)

			s.controller.setPlaybackRate(1.5, true)

			// Gapless play should not reuse aborted preload
			s.seedTrack(2, 'flac')
			await s.controller.play(2, { gapless: true })

			expect(engine3.play).toHaveBeenCalled()
		})

		it('does not throw when no track is loaded', () => {
			using s = setup()

			expect(() => s.controller.setPlaybackRate(1.5, true)).not.toThrow()
		})
	})

	describe('engine callbacks', () => {
		it('calls onTrackEnded when engine fires onEnded', async () => {
			using s = setup()
			const engine = makeHTMLEngine()
			mockCreateHTMLAudioEngine.mockResolvedValue(engine)
			s.seedTrack(1)
			await s.controller.play(1)

			engine.onEnded?.()

			expect(s.onTrackEnded).toHaveBeenCalledOnce()
		})

		it('calls onError with "error" when engine fires onError', async () => {
			using s = setup()
			const engine = makeHTMLEngine()
			mockCreateHTMLAudioEngine.mockResolvedValue(engine)
			s.seedTrack(1)
			await s.controller.play(1)

			engine.onError?.()

			expect(s.onError).toHaveBeenCalledWith('error')
		})
	})

	describe('loading state', () => {
		it('is true while track is loading', () => {
			using s = setup()
			let resolveLoad!: (v: TrackLoaderResult) => void
			s.trackLoader.mockReturnValue(new Promise((r) => (resolveLoad = r)))

			void s.controller.play(1)
			flushSync()

			expect(s.controller.loading).toBe(true)

			resolveLoad({ status: 'not-found' })
		})

		it('is false after track finishes loading without buffering', async () => {
			using s = setup()
			const engine = makeHTMLEngine()
			// buffering is false as const on HTML engine
			mockCreateHTMLAudioEngine.mockResolvedValue(engine)
			s.seedTrack(1)

			await s.controller.play(1)

			expect(s.controller.loading).toBe(false)
		})

		it('reflects engine.buffering when track is ready', async () => {
			using s = setup({ gaplessEnabled: true })
			mockSupportsBufferEngine.mockReturnValue(true)

			const engine = makeBufferEngine()
			engine.buffering = true
			mockCreateAudioBufferEngine.mockResolvedValue(engine)
			s.seedTrack(1, 'flac')

			await s.controller.play(1)

			expect(s.controller.loading).toBe(true)
		})
	})

	describe('engine selection', () => {
		it('uses HTML engine when gapless is disabled regardless of codec', async () => {
			using s = setup({ gaplessEnabled: false })
			s.seedTrack(1, 'flac')

			await s.controller.play(1)

			expect(mockCreateHTMLAudioEngine).toHaveBeenCalled()
			expect(mockCreateAudioBufferEngine).not.toHaveBeenCalled()
		})

		it('uses HTML engine when codec is not supported by buffer engine', async () => {
			using s = setup({ gaplessEnabled: true })
			mockSupportsBufferEngine.mockReturnValue(false)
			s.seedTrack(1, 'mp3')

			await s.controller.play(1)

			expect(mockCreateHTMLAudioEngine).toHaveBeenCalled()
			expect(mockCreateAudioBufferEngine).not.toHaveBeenCalled()
		})

		it('uses buffer engine when gapless is enabled and codec is supported', async () => {
			using s = setup({ gaplessEnabled: true })
			mockSupportsBufferEngine.mockReturnValue(true)
			s.seedTrack(1, 'flac')

			await s.controller.play(1)

			expect(mockCreateAudioBufferEngine).toHaveBeenCalled()
			expect(mockCreateHTMLAudioEngine).not.toHaveBeenCalled()
		})

		it('passes codec to supportsBufferEngine', async () => {
			using s = setup({ gaplessEnabled: true })
			s.seedTrack(1, 'flac')

			await s.controller.play(1)

			expect(mockSupportsBufferEngine).toHaveBeenCalledWith('flac')
		})
	})

	describe('concurrency', () => {
		it('aborts a superseded load before it builds an engine', async () => {
			using s = setup()
			const liveEngine = makeHTMLEngine()
			mockCreateHTMLAudioEngine.mockResolvedValue(liveEngine)

			// First load hangs; second load resolves immediately and supersedes it.
			let resolveStale!: (v: TrackLoaderResult) => void
			s.trackLoader
				.mockReturnValueOnce(new Promise((r) => (resolveStale = r)))
				.mockResolvedValueOnce(makeLoadedResult(2))

			const stalePlay = s.controller.play(1)
			const livePlay = s.controller.play(2)
			await livePlay

			// Release the superseded load only after the newer one has taken over.
			resolveStale(makeLoadedResult(1))
			await stalePlay

			expect(liveEngine.play).toHaveBeenCalled()
			expect(s.controller.duration).toBe(liveEngine.duration)
			// The superseded load aborts right after the loader resolves, before
			// ever constructing an engine — so only the live load builds one.
			expect(mockCreateHTMLAudioEngine).toHaveBeenCalledTimes(1)
			expect(s.onError).not.toHaveBeenCalled()
		})

		it('does not auto-play a track that finished loading after the user paused', async () => {
			using s = setup()
			const engine = makeHTMLEngine()
			mockCreateHTMLAudioEngine.mockResolvedValue(engine)

			let resolveLoad!: (v: TrackLoaderResult) => void
			s.trackLoader.mockReturnValue(new Promise((r) => (resolveLoad = r)))

			const playPromise = s.controller.play(1)
			s.controller.pause() // user pauses while the track is still loading
			resolveLoad(makeLoadedResult(1))
			await playPromise

			expect(s.controller.playing).toBe(false)
			expect(engine.play).not.toHaveBeenCalled()
		})

		it('seek() during an in-flight preload prevents it from becoming the next track', async () => {
			using s = setup({ gaplessEnabled: true })
			mockSupportsBufferEngine.mockReturnValue(true)

			const currentEngine = makeBufferEngine()
			mockCreateAudioBufferEngine.mockResolvedValueOnce(currentEngine)
			s.seedTrack(1, 'flac')
			await s.controller.play(1)

			// Preload track 2 with a loader we control, then seek before it resolves.
			let resolvePreload!: (v: TrackLoaderResult) => void
			s.trackLoader.mockReturnValueOnce(new Promise((r) => (resolvePreload = r)))
			const preloadPromise = s.controller.preloadNext(2)

			s.controller.seek(10) // aborts the in-flight preload

			resolvePreload(makeLoadedResult(2, 'flac'))
			await preloadPromise

			// A later gapless play(2) must perform a fresh load rather than reuse
			// the aborted preload, which never finished building an engine.
			s.seedTrack(2, 'flac')
			const freshEngine = makeBufferEngine()
			mockCreateAudioBufferEngine.mockResolvedValueOnce(freshEngine)
			await s.controller.play(2, { gapless: true })

			expect(freshEngine.play).toHaveBeenCalled()
			// current(1) + fresh(2); the aborted preload built nothing.
			expect(mockCreateAudioBufferEngine).toHaveBeenCalledTimes(2)
		})

		it('play(gapless) while a preload is still in-flight performs a fresh load', async () => {
			using s = setup({ gaplessEnabled: true })
			mockSupportsBufferEngine.mockReturnValue(true)

			const currentEngine = makeBufferEngine()
			const freshEngine = makeBufferEngine()
			mockCreateAudioBufferEngine
				.mockResolvedValueOnce(currentEngine)
				.mockResolvedValueOnce(freshEngine)

			s.seedTrack(1, 'flac')
			await s.controller.play(1)

			// Start a preload that never resolves before we supersede it.
			let resolvePreload!: (v: TrackLoaderResult) => void
			s.trackLoader.mockReturnValueOnce(new Promise((r) => (resolvePreload = r)))
			const preloadPromise = s.controller.preloadNext(2)

			// Direct gapless play of the same track while the preload is mid-flight.
			s.seedTrack(2, 'flac')
			await s.controller.play(2, { gapless: true })

			// Let the now-stale preload settle; it must not become next.
			resolvePreload(makeLoadedResult(2, 'flac'))
			await preloadPromise

			expect(freshEngine.play).toHaveBeenCalled()
			expect(mockCreateAudioBufferEngine).toHaveBeenCalledTimes(2)
		})
	})
})
