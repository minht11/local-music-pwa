import { flushSync } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MainStore } from '$lib/stores/main/store.svelte.ts'
import { PlayerStore } from '$lib/stores/player/player.svelte.ts'

interface MockOptions {
	onTrackEnded: () => void
	onError: (reason: string) => void
	isGaplessEnabled: () => boolean
}

const { MockPlaybackController, mockHistory, controllerRef } = vi.hoisted(() => {
	// No type declarations inside vi.hoisted (Oxc parser issue in .svelte.ts files)
	const controllerRef: { instance: unknown; options: unknown } = {
		instance: null,
		options: null,
	}

	const mockHistory = {
		begin: vi.fn(),
		update: vi.fn(),
		complete: vi.fn(),
	}

	class MockPlaybackController {
		playing = $state(false)
		duration = $state(0)
		currentTime = $state(0)
		loading = $state(false)

		play = vi.fn((_trackId: number, _opts?: unknown) => {
			this.playing = true
			return Promise.resolve()
		})
		pause = vi.fn(() => {
			this.playing = false
		})
		seek = vi.fn((time: number) => {
			this.currentTime = time
		})
		setPlaybackRate = vi.fn()
		preloadNext = vi.fn(() => Promise.resolve())
		abortNext = vi.fn()
		abort = vi.fn(() => {
			this.playing = false
			this.duration = 0
		})

		constructor(_graph: unknown, options: MockOptions) {
			controllerRef.instance = this
			controllerRef.options = options
		}
	}

	return { MockPlaybackController, mockHistory, controllerRef }
})

vi.mock('$lib/audio/playback-controller.svelte.ts', () => ({
	PlaybackController: MockPlaybackController,
}))

vi.mock('$lib/audio/audio-graph.svelte.ts', () => ({
	AudioGraph: class {
		initialized = false
		setVolume = vi.fn()
		dispose = vi.fn()
	},
}))

vi.mock('$lib/stores/player/equalizer.svelte.ts', () => ({
	EqualizerStore: class {
		init() {}
		resumeContext() {
			return Promise.resolve()
		}
		connectSource() {}
	},
}))

vi.mock('$lib/stores/player/media-session.svelte.ts', () => ({
	MediaSessionController: class {
		updatePosition() {}
	},
}))

vi.mock('$lib/stores/player/play-history-tracker.ts', () => ({
	PlayHistoryTracker: class {
		begin = mockHistory.begin
		update = mockHistory.update
		complete = mockHistory.complete
	},
}))

// Prevent BroadcastChannel usage in QueueStore
vi.mock('$lib/db/events.ts', () => ({
	onDatabaseChange: vi.fn(() => () => {}),
	dispatchDatabaseChangedEvent: vi.fn(),
}))

const queryTracks = new Map<number, { id: number; name: string; duration: number }>()

vi.mock('$lib/library/get/value-queries.ts', () => ({
	createTrackQuery: (idGetter: () => number, _opts?: unknown) => ({
		get value() {
			return queryTracks.get(idGetter()) ?? null
		},
		get error() {
			return undefined
		},
		get status() {
			return 'loaded'
		},
		get loading() {
			return false
		},
	}),
}))

vi.mock('$lib/helpers/persist.svelte.ts', () => ({
	persist: vi.fn(),
}))

vi.mock('$lib/helpers/create-managed-artwork.svelte', () => ({
	createManagedArtwork: () => () => undefined,
}))

vi.mock('$lib/helpers/file-resolver.ts', () => ({
	resolveTrackFile: vi.fn(() =>
		Promise.resolve({ status: 'loaded', file: new File([''], 'track.mp3') }),
	),
}))

vi.mock('$lib/library/get/value.ts', () => ({
	getLibraryValue: vi.fn(() =>
		Promise.resolve({
			directory: -1,
			format: { codec: 'mp3' },
			duration: 180,
			file: new File([''], 'track.mp3'),
		}),
	),
}))

const seedTrack = (id: number) => {
	queryTracks.set(id, { id, name: `Track ${id}`, duration: 180 })
}

const mockMain = { volumeSliderEnabled: true } as unknown as MainStore

let player!: PlayerStore
let cleanupPlayer: () => void
let ctrl: InstanceType<typeof MockPlaybackController> = null as never
let opts: MockOptions = null as never

beforeEach(() => {
	cleanupPlayer = $effect.root(() => {
		player = new PlayerStore(mockMain)
	})
	// Force initial effects (track-change, preload, history, volume, playback-rate)
	// to run now, then clear their side effects so tests start clean.
	flushSync()
	vi.clearAllMocks()
	ctrl = controllerRef.instance as InstanceType<typeof MockPlaybackController>
	opts = controllerRef.options as MockOptions
})

afterEach(() => {
	cleanupPlayer()
	vi.clearAllMocks()
	queryTracks.clear()
})

describe('PlayerStore', () => {
	describe('volume', () => {
		it('starts at 100 by default', () => {
			expect(player.volume).toBe(100)
		})

		it('can be updated and read back', () => {
			player.volume = 60
			expect(player.volume).toBe(60)
		})

		it('clamps to 0 when set below 0', () => {
			player.volume = -20
			expect(player.volume).toBe(0)
		})

		it('clamps to 100 when set above 100', () => {
			player.volume = 200
			expect(player.volume).toBe(100)
		})

		it('always returns 100 when volumeSliderEnabled is false, regardless of stored value', () => {
			const noSliderMain = { volumeSliderEnabled: false } as unknown as MainStore
			let noSliderPlayer!: PlayerStore
			const cleanup = $effect.root(() => {
				noSliderPlayer = new PlayerStore(noSliderMain)
			})
			noSliderPlayer.volume = 40
			expect(noSliderPlayer.volume).toBe(100)
			cleanup()
		})
	})

	describe('toggleRepeat', () => {
		it('cycles none → all → one → none', () => {
			expect(player.repeat).toBe('none')
			player.toggleRepeat()
			expect(player.repeat).toBe('all')
			player.toggleRepeat()
			expect(player.repeat).toBe('one')
			player.toggleRepeat()
			expect(player.repeat).toBe('none')
		})
	})

	describe('playFrom', () => {
		it('calls controller.play with the correct track id and fromBeginning', () => {
			seedTrack(1)
			player.playFrom(0, [1, 2, 3])
			expect(ctrl.play).toHaveBeenCalledWith(1, { fromBeginning: true })
		})

		it('updates the source queue to reflect the new list', () => {
			seedTrack(1)
			seedTrack(2)
			player.playFrom(0, [1, 2])
			expect(player.queue.current).toMatchObject({ layer: 'source', trackId: 1 })
			expect(player.queue.count('source')).toBe(1)
			expect(player.queue.itemAt('source', 0)?.trackId).toBe(2)
		})

		it('enables shuffle and pins the current track to the front when called with shuffle', () => {
			seedTrack(1)
			seedTrack(2)
			seedTrack(3)
			player.playFrom('shuffle', [1, 2, 3])
			expect(player.queue.shuffle).toBe(true)
			expect(player.queue.current?.layer).toBe('source')
			// Two of three upcoming means the current track sits at the front.
			expect(player.queue.count('source')).toBe(2)
		})

		it('exposes the queue origin', () => {
			seedTrack(1)
			player.playFrom(0, [1], { type: 'album', name: 'Album A' })
			expect(player.queue.origin).toEqual({ type: 'album', name: 'Album A' })
		})
	})

	describe('play', () => {
		it('calls controller.play with the current queue track id', () => {
			seedTrack(5)
			player.playFrom(0, [5])
			vi.clearAllMocks()

			player.play()

			expect(ctrl.play).toHaveBeenCalledWith(5)
		})

		it('plays the current entry before its track query has resolved', () => {
			// An unseeded track stands in for a query that has not come back yet.
			// Enqueueing onto an idle player makes track 7 current; pressing play
			// right then must not wait on the query — the loader fetches the track.
			player.queue.enqueue([7], 'last')
			expect(player.activeTrack).toBeNull()

			player.play()

			expect(ctrl.play).toHaveBeenCalledWith(7)
		})

		it('does nothing when the queue is empty', () => {
			player.play()
			expect(ctrl.play).not.toHaveBeenCalled()
		})
	})

	describe('pause', () => {
		it('calls controller.pause', () => {
			player.pause()
			expect(ctrl.pause).toHaveBeenCalled()
		})
	})

	describe('togglePlay', () => {
		it('calls play when not currently playing', () => {
			seedTrack(1)
			player.playFrom(0, [1])
			vi.clearAllMocks()

			ctrl.playing = false
			player.togglePlay()

			expect(ctrl.play).toHaveBeenCalledWith(1)
		})

		it('calls pause when currently playing', () => {
			ctrl.playing = true
			player.togglePlay()
			expect(ctrl.pause).toHaveBeenCalled()
		})
	})

	describe('seek', () => {
		it('delegates to controller.seek', () => {
			player.seek(42)
			expect(ctrl.seek).toHaveBeenCalledWith(42)
		})
	})

	describe('manual queue', () => {
		it('playNext consumes the manual queue before the context', () => {
			seedTrack(1)
			seedTrack(2)
			seedTrack(9)
			player.playFrom(0, [1, 2])
			player.queue.enqueue([9], 'next')
			vi.clearAllMocks()

			player.playNext()

			expect(ctrl.play).toHaveBeenCalledWith(9, { fromBeginning: true })
			expect(player.queue.count('manual')).toBe(0)

			player.playNext()
			expect(ctrl.play).toHaveBeenLastCalledWith(2, { fromBeginning: true })
		})

		it('track ended advances into the manual queue with gapless flag', () => {
			seedTrack(1)
			seedTrack(2)
			seedTrack(9)
			player.playFrom(0, [1, 2])
			player.queue.enqueue([9], 'last')
			vi.clearAllMocks()

			opts.onTrackEnded()

			expect(ctrl.play).toHaveBeenCalledWith(9, { gapless: true, fromBeginning: true })
		})

		it('preloads the first manual track near the end of the current one', () => {
			seedTrack(1)
			seedTrack(2)
			seedTrack(9)
			player.playFrom(0, [1, 2])
			player.queue.enqueue([9], 'next')
			flushSync()
			vi.clearAllMocks()

			ctrl.duration = 30
			ctrl.currentTime = 25
			flushSync()

			expect(ctrl.preloadNext).toHaveBeenCalledWith(9)
		})

		it('playQueueEntry plays the chosen manual track and discards skipped ones', () => {
			seedTrack(1)
			seedTrack(8)
			seedTrack(9)
			player.playFrom(0, [1])
			player.queue.enqueue([8, 9], 'last')
			const entryId = player.queue.itemAt('manual', 1)?.entryId
			invariant(entryId !== undefined)
			vi.clearAllMocks()

			player.playQueueEntry(entryId)

			expect(ctrl.play).toHaveBeenCalledWith(9, { fromBeginning: true })
			expect(player.queue.count('manual')).toBe(0)
		})

		it('playQueueEntry jumps within the source', () => {
			seedTrack(1)
			seedTrack(2)
			seedTrack(3)
			player.playFrom(0, [1, 2, 3])
			const entryId = player.queue.itemAt('source', 1)?.entryId
			invariant(entryId !== undefined)
			vi.clearAllMocks()

			player.playQueueEntry(entryId)

			expect(ctrl.play).toHaveBeenCalledWith(3, { fromBeginning: true })
		})
	})

	describe('playNext', () => {
		it('plays the next track in the queue', () => {
			seedTrack(1)
			seedTrack(2)
			player.playFrom(0, [1, 2])
			vi.clearAllMocks()

			player.playNext()

			expect(player.queue.current).toMatchObject({ layer: 'source', trackId: 2 })
			expect(ctrl.play).toHaveBeenCalledWith(2, { fromBeginning: true })
		})

		it('wraps to the first track when at the end of the queue', () => {
			seedTrack(1)
			seedTrack(2)
			player.playFrom(1, [1, 2])
			vi.clearAllMocks()

			player.playNext()

			expect(player.queue.current).toMatchObject({ layer: 'source', trackId: 1 })
			expect(ctrl.play).toHaveBeenCalledWith(1, { fromBeginning: true })
		})
	})

	describe('playPrev', () => {
		it('seeks to the beginning of the current track when currentTime > 3 seconds', () => {
			seedTrack(1)
			seedTrack(2)
			player.playFrom(1, [1, 2])
			vi.clearAllMocks()

			ctrl.currentTime = 10
			player.playPrev()

			// Still the same source entry (track 2)
			expect(player.queue.current).toMatchObject({ layer: 'source', trackId: 2 })
			expect(ctrl.play).toHaveBeenCalledWith(2, { fromBeginning: true })
		})

		it('plays the previous track when currentTime <= 3 seconds', () => {
			seedTrack(1)
			seedTrack(2)
			player.playFrom(1, [1, 2])
			vi.clearAllMocks()

			ctrl.currentTime = 2
			player.playPrev()

			expect(player.queue.current).toMatchObject({ layer: 'source', trackId: 1 })
			expect(ctrl.play).toHaveBeenCalledWith(1, { fromBeginning: true })
		})

		it('wraps to the last track when at the first track with currentTime <= 3', () => {
			seedTrack(1)
			seedTrack(2)
			seedTrack(3)
			player.playFrom(0, [1, 2, 3])
			vi.clearAllMocks()

			ctrl.currentTime = 0
			player.playPrev()

			expect(player.queue.current).toMatchObject({ layer: 'source', trackId: 3 })
			expect(ctrl.play).toHaveBeenCalledWith(3, { fromBeginning: true })
		})
	})

	describe('upNextTrackId', () => {
		it('is null at the end of a manual-only queue despite repeat all', () => {
			seedTrack(8)
			player.queue.enqueue([8], 'last')
			player.repeat = 'all'

			// The repeat mode alone would promise a wrap; there is nothing to wrap to.
			expect(player.repeat).toBe('all')
			expect(player.queue.current).toMatchObject({ layer: 'manual', trackId: 8 })
			expect(player.upNextTrackId).toBeNull()
		})

		it('wraps to the first source track at the end when repeat is all', () => {
			seedTrack(1)
			seedTrack(2)
			player.playFrom(1, [1, 2])
			player.repeat = 'all'

			expect(player.upNextTrackId).toBe(1)
		})

		it('is the current track when repeat is one', () => {
			seedTrack(1)
			player.playFrom(0, [1])
			player.repeat = 'one'

			expect(player.upNextTrackId).toBe(1)
		})

		it('is null at the end of the queue when repeat is none', () => {
			seedTrack(1)
			player.playFrom(0, [1])
			player.repeat = 'none'

			expect(player.upNextTrackId).toBeNull()
		})
	})

	describe('track ended handler', () => {
		it('advances the queue and plays next track with gapless flag', () => {
			seedTrack(1)
			seedTrack(2)
			player.playFrom(0, [1, 2])
			vi.clearAllMocks()

			opts.onTrackEnded()

			expect(player.queue.current).toMatchObject({ layer: 'source', trackId: 2 })
			expect(ctrl.play).toHaveBeenCalledWith(2, { gapless: true, fromBeginning: true })
		})

		it('pauses when no next track and repeat is none', () => {
			seedTrack(1)
			player.playFrom(0, [1])
			player.repeat = 'none'
			vi.clearAllMocks()

			opts.onTrackEnded()

			expect(ctrl.pause).toHaveBeenCalled()
			expect(ctrl.play).not.toHaveBeenCalled()
		})

		it('wraps to the first track when repeat is all and queue ends', () => {
			seedTrack(1)
			seedTrack(2)
			player.playFrom(1, [1, 2])
			player.repeat = 'all'
			vi.clearAllMocks()

			opts.onTrackEnded()

			expect(player.queue.current).toMatchObject({ layer: 'source', trackId: 1 })
			expect(ctrl.play).toHaveBeenCalledWith(1, { gapless: true, fromBeginning: true })
		})

		it('pauses at the end of a manual-only queue even when repeat is all', () => {
			seedTrack(8)
			seedTrack(9)
			// Enqueued with nothing playing, so 8 becomes current and the source layer
			// stays empty — repeat has no earlier track to wrap back to.
			player.queue.enqueue([8, 9], 'last')
			player.repeat = 'all'

			opts.onTrackEnded()
			expect(player.queue.current).toMatchObject({ layer: 'manual', trackId: 9 })

			vi.clearAllMocks()
			opts.onTrackEnded()

			expect(ctrl.pause).toHaveBeenCalled()
			expect(ctrl.play).not.toHaveBeenCalled()
		})

		it('replays the same track when repeat is one', () => {
			seedTrack(1)
			seedTrack(2)
			player.playFrom(0, [1, 2])
			player.repeat = 'one'
			vi.clearAllMocks()

			opts.onTrackEnded()

			expect(player.queue.current).toMatchObject({ layer: 'source', trackId: 1 })
			expect(ctrl.play).toHaveBeenCalledWith(1, { gapless: true, fromBeginning: true })
		})

		it('pauses when pauseAfterTrackWhenRepeatIsOff is true and repeat is none', () => {
			seedTrack(1)
			seedTrack(2)
			player.playFrom(0, [1, 2])
			player.repeat = 'none'
			player.pauseAfterTrackWhenRepeatIsOff = true
			vi.clearAllMocks()

			opts.onTrackEnded()

			expect(ctrl.pause).toHaveBeenCalled()
			expect(ctrl.play).not.toHaveBeenCalled()
		})

		it('calls history.complete when a track ends', () => {
			seedTrack(1)
			player.playFrom(0, [1])
			vi.clearAllMocks()

			opts.onTrackEnded()

			expect(mockHistory.complete).toHaveBeenCalled()
		})
	})

	describe('play history tracking', () => {
		it('calls history.begin with the track id when a track becomes active', () => {
			seedTrack(7)
			player.playFrom(0, [7])
			flushSync()

			expect(mockHistory.begin).toHaveBeenCalledWith(7)
		})

		it('calls history.begin again with the new id when the active track changes', () => {
			seedTrack(1)
			seedTrack(2)
			player.playFrom(0, [1, 2])
			flushSync()
			const entryId = player.queue.itemAt('source', 0)?.entryId
			invariant(entryId !== undefined)
			vi.clearAllMocks()

			player.playQueueEntry(entryId)
			flushSync()

			expect(mockHistory.begin).toHaveBeenCalledWith(2)
		})

		it('calls history.update when currentTime changes', () => {
			ctrl.duration = 180
			ctrl.currentTime = 60
			flushSync()

			expect(mockHistory.update).toHaveBeenLastCalledWith(60, 180)
		})
	})

	describe('preload effect', () => {
		it('calls preloadNext with the next track id when within 10 seconds of the end', () => {
			seedTrack(1)
			seedTrack(2)
			player.playFrom(0, [1, 2])
			flushSync()
			vi.clearAllMocks()

			ctrl.duration = 30
			ctrl.currentTime = 25 // 5 seconds remaining
			flushSync()

			expect(ctrl.preloadNext).toHaveBeenCalledWith(2)
		})

		it('does not preload when more than 10 seconds remain', () => {
			seedTrack(1)
			seedTrack(2)
			player.playFrom(0, [1, 2])
			flushSync()
			vi.clearAllMocks()

			ctrl.duration = 60
			ctrl.currentTime = 10 // 50 seconds remaining
			flushSync()

			expect(ctrl.preloadNext).not.toHaveBeenCalled()
		})

		it('calls abortNext when near the end with no next track', () => {
			seedTrack(1)
			player.playFrom(0, [1])
			player.repeat = 'none'
			flushSync()
			vi.clearAllMocks()

			ctrl.duration = 30
			ctrl.currentTime = 25
			flushSync()

			expect(ctrl.abortNext).toHaveBeenCalled()
			expect(ctrl.preloadNext).not.toHaveBeenCalled()
		})
	})
})
