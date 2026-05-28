import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FileLoadFailReason } from '$lib/helpers/file-resolver.ts'
import { PlaybackController } from '../playback-controller.svelte.ts'

const { MockEngine, createdEngines, mockSupportsBufferEngine } = vi.hoisted(() => {
	class MockEngine {
		trackId = 0
		currentTime = 0
		duration = 180
		endTime = 200

		onEnded: (() => void) | null = null
		onError: (() => void) | null = null

		load = vi.fn((_scheduledAt?: number): Promise<void> => Promise.resolve())
		play = vi.fn((): Promise<void> => Promise.resolve())
		pause = vi.fn()
		seek = vi.fn()
		dispose = vi.fn()
		setPlaybackRate = vi.fn()

		simulateEnd(): void {
			this.onEnded?.()
		}
		simulateError(): void {
			this.onError?.()
		}
	}

	return {
		MockEngine,
		createdEngines: [] as InstanceType<typeof MockEngine>[],
		mockSupportsBufferEngine: vi.fn(() => true as boolean | Promise<boolean>),
	}
})

vi.mock('../engine-buffer.svelte.ts', () => ({
	AudioBufferEngine: class extends MockEngine {
		constructor(_options: unknown) {
			super()
			createdEngines.push(this)
		}
	},
	supportsBufferEngine: mockSupportsBufferEngine,
}))

vi.mock('../engine-html.svelte.ts', () => ({
	HTMLAudioEngine: class extends MockEngine {
		constructor(_options: unknown) {
			super()
			createdEngines.push(this)
		}
	},
}))

const mockGraph = {} as never

const makeTrack = (id: number, codec = 'flac') =>
	({ id, duration: 180, format: { codec } }) as never

const makeLoader = (id = 1, codec = 'flac') =>
	vi.fn(async () => ({
		status: 'loaded' as const,
		file: new File([], `track-${id}.flac`),
		track: makeTrack(id, codec),
	}))

const makeFailingLoader = (reason: FileLoadFailReason) => vi.fn(async () => ({ status: reason }))

const makeSlowLoader = (id: number, codec = 'flac') => {
	let resolveLoader!: () => void
	const loader = vi.fn(
		() =>
			new Promise<{ status: 'loaded'; file: File; track: never }>((resolve) => {
				resolveLoader = () =>
					resolve({
						status: 'loaded',
						file: new File([], `track-${id}.flac`),
						track: makeTrack(id, codec),
					})
			}),
	)
	return { loader, resolveLoader: () => resolveLoader() }
}

const makePlayer = (overrides: Partial<ConstructorParameters<typeof PlaybackController>[1]> = {}) =>
	new PlaybackController(mockGraph, {
		trackEndPolicy: () => 'advance' as const,
		onTrackEnded: vi.fn(),
		onError: vi.fn(),
		isGaplessEnabled: () => false,
		...overrides,
	})

const getEngine = (index: number) => {
	const engine = createdEngines[index]
	invariant(engine, `Expected engine at index ${index} to exist`)

	return engine
}

describe('PlaybackController', () => {
	beforeEach(() => {
		createdEngines.length = 0
		mockSupportsBufferEngine.mockReturnValue(true)
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('engine selection', () => {
		it('uses AudioBufferEngine when gapless is enabled and codec is supported', async () => {
			const player = makePlayer({ isGaplessEnabled: () => true })
			await player.load(1, makeLoader(1, 'flac'))

			const { AudioBufferEngine } = await import('../engine-buffer.svelte.ts')
			expect(createdEngines[0]).toBeInstanceOf(AudioBufferEngine)
		})

		it('uses HTMLAudioEngine when gapless is disabled regardless of codec', async () => {
			const player = makePlayer({ isGaplessEnabled: () => false })
			await player.load(1, makeLoader(1, 'flac'))

			const { HTMLAudioEngine } = await import('../engine-html.svelte.ts')
			expect(createdEngines[0]).toBeInstanceOf(HTMLAudioEngine)
		})

		it('falls back to HTMLAudioEngine when codec is unsupported even with gapless enabled', async () => {
			mockSupportsBufferEngine.mockReturnValue(false)
			const player = makePlayer({ isGaplessEnabled: () => true })
			await player.load(1, makeLoader(1, 'mp3'))

			const { HTMLAudioEngine } = await import('../engine-html.svelte.ts')
			expect(createdEngines[0]).toBeInstanceOf(HTMLAudioEngine)
		})

		it('awaits a Promise<boolean> from supportsBufferEngine before choosing engine', async () => {
			mockSupportsBufferEngine.mockReturnValue(Promise.resolve(true))
			const player = makePlayer({ isGaplessEnabled: () => true })
			await player.load(1, makeLoader(1, 'flac'))

			const { AudioBufferEngine } = await import('../engine-buffer.svelte.ts')
			expect(createdEngines[0]).toBeInstanceOf(AudioBufferEngine)
		})

		it('marks next slot unavailable when next codec cannot use AudioBufferEngine', async () => {
			const player = makePlayer({ isGaplessEnabled: () => true })
			await player.load(1, makeLoader(1, 'flac'))

			mockSupportsBufferEngine.mockReturnValue(false)
			const nextLoader = makeLoader(2, 'wav')
			await player.scheduleNext(2, nextLoader)

			expect(nextLoader).toHaveBeenCalledTimes(1)
			expect(player.nextScheduledTrackId).toBe(2)
			expect(createdEngines).toHaveLength(1)
		})
	})

	describe('scheduleAt lazy evaluation', () => {
		it('scheduleAt receives endTime sampled after the async file fetch, not before', async () => {
			const player = makePlayer({ isGaplessEnabled: () => true })
			await player.load(1, makeLoader(1, 'flac'))

			const currentEngine = getEngine(0)
			currentEngine.endTime = 30

			const loader = vi.fn(() => {
				currentEngine.endTime = 35
				return Promise.resolve({
					status: 'loaded' as const,
					file: new File([], 'track-2.flac'),
					track: makeTrack(2, 'flac'),
				})
			})

			await player.scheduleNext(2, loader)

			expect(getEngine(1).load).toHaveBeenCalledWith(35)
		})

		it('passes undefined scheduleAt for a regular load so playback starts immediately', async () => {
			const player = makePlayer()
			await player.load(1, makeLoader())

			expect(getEngine(0).load).toHaveBeenCalledWith(undefined)
		})
	})

	describe('playing intent through async lifecycle', () => {
		it('sets playing=true eagerly while the load is still in-flight', async () => {
			const player = makePlayer()
			let playingDuringLoad = false

			const loader = vi.fn(() => {
				playingDuringLoad = player.playing
				return Promise.resolve({
					status: 'loaded' as const,
					file: new File([], 't.flac'),
					track: makeTrack(1, 'mp3'),
				})
			})

			await player.load(1, loader)

			expect(playingDuringLoad).toBe(true)
		})

		it('calls engine.play() after a successful load', async () => {
			const player = makePlayer()
			await player.load(1, makeLoader())

			expect(getEngine(0).play).toHaveBeenCalledTimes(1)
		})

		it('skips engine.play() when pause() is called while load is in-flight', async () => {
			const player = makePlayer()

			const loader = vi.fn(() => {
				player.pause() // pause while we are mid-load
				return Promise.resolve({
					status: 'loaded' as const,
					file: new File([], 't.flac'),
					track: makeTrack(1, 'mp3'),
				})
			})

			await player.load(1, loader)

			expect(getEngine(0).play).not.toHaveBeenCalled()
		})

		it('sets playing=false when the loader fails', async () => {
			const player = makePlayer()
			await player.load(1, makeFailingLoader('not-found'))

			expect(player.playing).toBe(false)
		})
	})

	describe('load() state machine', () => {
		it('transitions to ready with correct trackId and duration', async () => {
			const player = makePlayer()
			await player.load(1, makeLoader())

			expect(player.currentStatus).toBe('ready')
			expect(player.currentTrackId).toBe(1)
			expect(player.duration).toBe(180)
		})

		it('is a no-op when called with the same trackId while already loading', async () => {
			const player = makePlayer()
			const loader = makeLoader()

			const p1 = player.load(1, loader)
			const p2 = player.load(1, loader)
			await Promise.all([p1, p2])

			expect(loader).toHaveBeenCalledTimes(1)
			expect(createdEngines).toHaveLength(1)
		})

		it('is a no-op when called with the same trackId while already ready', async () => {
			const player = makePlayer()
			const loader = makeLoader()

			await player.load(1, loader)
			await player.load(1, loader)

			expect(loader).toHaveBeenCalledTimes(1)
		})

		it('replaces the current engine when a different trackId is loaded', async () => {
			const player = makePlayer()
			await player.load(1, makeLoader(1))
			await player.load(2, makeLoader(2))

			expect(player.currentTrackId).toBe(2)
			expect(player.currentStatus).toBe('ready')
			expect(createdEngines).toHaveLength(2)
		})

		it('retries a failed load when called again with the same trackId', async () => {
			const player = makePlayer()
			await player.load(1, makeFailingLoader('not-found'))
			expect(player.currentStatus).toBe('failed')

			const goodLoader = makeLoader(1)
			await player.load(1, goodLoader)

			expect(goodLoader).toHaveBeenCalledTimes(1)
			expect(player.currentStatus).toBe('ready')
		})

		it('abort() resets to idle and clears duration', async () => {
			const player = makePlayer()
			await player.load(1, makeLoader())

			player.abort()

			expect(player.currentStatus).toBe('idle')
			expect(player.currentTrackId).toBeNull()
			expect(player.playing).toBe(false)
			expect(player.duration).toBe(0)
		})
	})

	describe('scheduleNext() pre-buffering', () => {
		it('skips loading and marks next unavailable when gapless is disabled', async () => {
			const player = makePlayer({ isGaplessEnabled: () => false })
			await player.load(1, makeLoader(1))

			const nextLoader = makeLoader(2)
			await player.scheduleNext(2, nextLoader)

			expect(nextLoader).not.toHaveBeenCalled()
			expect(player.nextScheduledTrackId).toBe(2)
		})

		it('skips loading when current engine is not AudioBufferEngine', async () => {
			mockSupportsBufferEngine.mockReturnValue(false)
			const player = makePlayer({ isGaplessEnabled: () => true })
			await player.load(1, makeLoader(1, 'mp3'))
			mockSupportsBufferEngine.mockReturnValue(true)

			const nextLoader = makeLoader(2)
			await player.scheduleNext(2, nextLoader)

			expect(nextLoader).not.toHaveBeenCalled()
		})

		it('loads a second engine when current is AudioBufferEngine and gapless is on', async () => {
			const player = makePlayer({ isGaplessEnabled: () => true })
			await player.load(1, makeLoader(1, 'flac'))
			await player.scheduleNext(2, makeLoader(2, 'flac'))

			expect(createdEngines).toHaveLength(2)
			expect(player.nextScheduledTrackId).toBe(2)
		})

		it('is a no-op when called with the same trackId while next is loading', async () => {
			const player = makePlayer({ isGaplessEnabled: () => true })
			await player.load(1, makeLoader(1, 'flac'))

			const nextLoader = makeLoader(2, 'flac')
			const p1 = player.scheduleNext(2, nextLoader)
			const p2 = player.scheduleNext(2, nextLoader)
			await Promise.all([p1, p2])

			expect(nextLoader).toHaveBeenCalledTimes(1)
		})

		it('is a no-op when called with the same trackId while next is ready', async () => {
			const player = makePlayer({ isGaplessEnabled: () => true })
			await player.load(1, makeLoader(1, 'flac'))

			const nextLoader = makeLoader(2, 'flac')
			await player.scheduleNext(2, nextLoader)
			await player.scheduleNext(2, nextLoader)

			expect(nextLoader).toHaveBeenCalledTimes(1)
		})

		it('replaces the pre-buffered engine when called with a different trackId', async () => {
			const player = makePlayer({ isGaplessEnabled: () => true })
			await player.load(1, makeLoader(1, 'flac'))
			await player.scheduleNext(2, makeLoader(2, 'flac'))

			expect(player.nextScheduledTrackId).toBe(2)

			await player.scheduleNext(3, makeLoader(3, 'flac'))

			expect(player.nextScheduledTrackId).toBe(3)
			expect(createdEngines).toHaveLength(3)
		})
	})

	describe('track promotion on natural track end', () => {
		it('promotes the pre-buffered next engine to current when policy is advance', async () => {
			const onTrackEnded = vi.fn()
			const player = makePlayer({ isGaplessEnabled: () => true, onTrackEnded })

			await player.load(1, makeLoader(1, 'flac'))
			await player.scheduleNext(2, makeLoader(2, 'flac'))

			getEngine(0).simulateEnd()

			expect(player.currentTrackId).toBe(2)
			expect(player.currentStatus).toBe('ready')
			expect(onTrackEnded).toHaveBeenCalledTimes(1)
		})

		it('onTrackEnded fires after promotion so currentTrackId is already the new track', async () => {
			let trackIdAtCallback: number | null = null
			const onTrackEnded = vi.fn(() => {
				trackIdAtCallback = player.currentTrackId
			})
			const player = makePlayer({ isGaplessEnabled: () => true, onTrackEnded })

			await player.load(1, makeLoader(1, 'flac'))
			await player.scheduleNext(2, makeLoader(2, 'flac'))

			getEngine(0).simulateEnd()

			expect(trackIdAtCallback).toBe(2)
		})

		it('rewires onEnded on the promoted engine so subsequent ends keep firing onTrackEnded', async () => {
			const onTrackEnded = vi.fn()
			const player = makePlayer({ isGaplessEnabled: () => true, onTrackEnded })

			await player.load(1, makeLoader(1, 'flac'))
			await player.scheduleNext(2, makeLoader(2, 'flac'))

			getEngine(0).simulateEnd() // promotes track 2
			getEngine(1).simulateEnd() // promoted engine ends naturally

			expect(onTrackEnded).toHaveBeenCalledTimes(2)
		})

		it('does not promote and goes idle when track end policy is repeat', async () => {
			const onTrackEnded = vi.fn()
			const player = makePlayer({
				isGaplessEnabled: () => true,
				trackEndPolicy: () => 'repeat',
				onTrackEnded,
			})

			await player.load(1, makeLoader(1, 'flac'))
			await player.scheduleNext(2, makeLoader(2, 'flac'))

			getEngine(0).simulateEnd()

			expect(player.currentStatus).toBe('idle')
			expect(player.currentTrackId).toBeNull()
			expect(onTrackEnded).toHaveBeenCalledTimes(1)
		})

		it('does not promote when the next engine is still loading when the current track ends', async () => {
			const onTrackEnded = vi.fn()
			const player = makePlayer({ isGaplessEnabled: () => true, onTrackEnded })

			await player.load(1, makeLoader(1, 'flac'))

			const { loader: slowLoader, resolveLoader } = makeSlowLoader(2, 'flac')
			const nextPromise = player.scheduleNext(2, slowLoader)

			getEngine(0).simulateEnd()

			expect(player.currentStatus).toBe('idle')
			expect(onTrackEnded).toHaveBeenCalledTimes(1)

			resolveLoader()
			await nextPromise
			expect(player.nextScheduledTrackId).toBeNull()
		})
	})

	describe('setPlaybackRate', () => {
		it('propagates the new rate to the current engine', async () => {
			const player = makePlayer()
			await player.load(1, makeLoader())

			player.setPlaybackRate(1.5, true)

			expect(getEngine(0).setPlaybackRate).toHaveBeenCalledWith(1.5, true)
		})

		it('does not throw when there is no current engine', () => {
			const player = makePlayer()
			expect(() => player.setPlaybackRate(1.5, true)).not.toThrow()
		})

		it('tears down an in-progress scheduleNext', async () => {
			const player = makePlayer({ isGaplessEnabled: () => true })
			await player.load(1, makeLoader(1, 'flac'))

			const { loader: slowLoader, resolveLoader } = makeSlowLoader(2, 'flac')
			const nextPromise = player.scheduleNext(2, slowLoader)

			player.setPlaybackRate(1.5, true)

			resolveLoader()
			await nextPromise

			expect(player.nextScheduledTrackId).toBeNull()
		})
	})

	describe('seek', () => {
		it('calls engine.seek with the target time', async () => {
			const player = makePlayer()
			await player.load(1, makeLoader())

			player.seek(42)

			expect(getEngine(0).seek).toHaveBeenCalledWith(42)
		})

		it('cancels any pre-buffered next track', async () => {
			const player = makePlayer({ isGaplessEnabled: () => true })
			await player.load(1, makeLoader(1, 'flac'))
			await player.scheduleNext(2, makeLoader(2, 'flac'))

			expect(player.nextScheduledTrackId).toBe(2)
			player.seek(10)
			expect(player.nextScheduledTrackId).toBeNull()
		})
	})

	describe('abort signal propagation', () => {
		it('a newer load() aborts an earlier in-flight load', async () => {
			const player = makePlayer()

			const { loader: slowLoader, resolveLoader } = makeSlowLoader(1, 'mp3')

			const p1 = player.load(1, slowLoader)
			const p2 = player.load(2, makeLoader(2, 'mp3'))

			await p2

			resolveLoader()
			await p1

			expect(player.currentTrackId).toBe(2)
			expect(player.currentStatus).toBe('ready')
			expect(createdEngines).toHaveLength(1)
		})

		it('an aborted load leaves the player in the state set by the winning load', async () => {
			const player = makePlayer()
			await player.load(1, makeLoader(1))

			const { loader: slowLoader, resolveLoader } = makeSlowLoader(2, 'mp3')
			const p2 = player.load(2, slowLoader)

			await player.load(3, makeLoader(3))

			resolveLoader()
			await p2

			expect(player.currentTrackId).toBe(3)
			expect(player.currentStatus).toBe('ready')
		})

		it('an aborted scheduleNext does not revive the next slot after resolving', async () => {
			const player = makePlayer({ isGaplessEnabled: () => true })
			await player.load(1, makeLoader(1, 'flac'))

			const { loader: slowLoader, resolveLoader } = makeSlowLoader(2, 'flac')
			const nextPromise = player.scheduleNext(2, slowLoader)

			player.seek(5)
			expect(player.nextScheduledTrackId).toBeNull()

			resolveLoader()
			await nextPromise
			expect(player.nextScheduledTrackId).toBeNull()
		})
	})
})
