import 'fake-indexeddb/auto'
import { flushSync } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDatabase } from '$lib/db/database.ts'
import { clearDatabaseStores, expectToBeDefined } from '$lib/helpers/test-helpers.ts'
import { dbRemoveTrack } from '$lib/library/remove'
import { LEGACY_NO_NATIVE_DIRECTORY, type Track } from '$lib/library/types.ts'
import { PlayerStore } from '$lib/stores/player/player.svelte.ts'

const queryTracks = vi.hoisted(
	() =>
		new Map<
			number,
			{
				id: number
				name: string
				artists: string[]
				album: string
				file: Track['file']
				image?: { full: Blob }
			}
		>(),
)

vi.mock('$lib/library/get/value-queries.ts', () => ({
	createTrackQuery: (idGetter: () => number) => ({
		get value() {
			return queryTracks.get(idGetter())
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

vi.mock('$lib/stores/main/use-store.ts', () => ({
	useMainStore: () => ({
		volumeSliderEnabled: true,
	}),
}))

vi.mock('$lib/stores/player/equalizer.svelte.ts', () => ({
	EqualizerStore: class {
		init() {}
		resumeContext() {
			return Promise.resolve()
		}
		setBand() {}
		applyPreset() {}
		reset() {}
	},
}))

const createPlayerInRoot = () => {
	let player: PlayerStore | undefined
	const cleanup = $effect.root(() => {
		player = new PlayerStore()
	})

	expectToBeDefined(player)

	return {
		player,
		[Symbol.dispose]: cleanup,
	}
}

class MediaMetadataMock {}

class MockAudio {
	src = ''
	paused = true
	currentTime = 0
	duration = 0
	volume = 1
	playbackRate = 1
	preservesPitch = true
	mozPreservesPitch = true
	webkitPreservesPitch = true

	onplay: (() => void) | null = null
	onpause: (() => void) | null = null
	onended: (() => void) | null = null
	ondurationchange: (() => void) | null = null
	ontimeupdate: (() => void) | null = null

	play = vi.fn(() => {
		this.paused = false
		this.onplay?.()

		return Promise.resolve()
	})

	pause = vi.fn(() => {
		this.paused = true
		this.onpause?.()

		return Promise.resolve()
	})
}

const getPlayHistoryEntries = async () => {
	const db = await getDatabase()
	return db.getAll('playHistory')
}

const seedTrack = async (id: number) => {
	const db = await getDatabase()
	const trackData: Track = {
		id,
		uuid: `track-${id}`,
		name: `Track ${id}`,
		artists: ['Artist'],
		album: 'Album',
		year: '2026',
		duration: 180,
		genre: [],
		trackNo: 1,
		trackOf: 1,
		discNo: 1,
		discOf: 1,
		fileName: `track-${id}.mp3`,
		directory: LEGACY_NO_NATIVE_DIRECTORY,
		scannedAt: Date.now(),
		file: new File(['x'], `track-${id}.mp3`, { type: 'audio/mpeg' }),
	}

	await db.add('tracks', trackData)
	queryTracks.set(id, {
		id,
		name: trackData.name,
		artists: ['Artist'],
		album: 'Album',
		file: trackData.file,
	})
}

describe('PlayerStore', () => {
	describe('Play history', () => {
		let mediaSession: {
			metadata: MediaMetadata | null
			setActionHandler: ReturnType<typeof vi.fn>
		}
		let audioInstance: MockAudio | undefined

		const audioWithCurrentTime = (time: number) => {
			expectToBeDefined(audioInstance)
			audioInstance.currentTime = time
			audioInstance.duration = 180

			return audioInstance
		}

		beforeEach(async () => {
			await clearDatabaseStores()

			mediaSession = {
				metadata: null,
				setActionHandler: vi.fn(),
			}
			audioInstance = undefined

			class AudioConstructor extends MockAudio {
				constructor() {
					super()
					audioInstance = this
				}
			}

			vi.stubGlobal('Audio', AudioConstructor)
			vi.stubGlobal('MediaMetadata', MediaMetadataMock)
			vi.stubGlobal('navigator', {
				mediaSession,
			})
			vi.stubGlobal('window', {
				navigator: {
					mediaSession,
				},
			})
			vi.stubGlobal('location', {
				origin: 'http://localhost',
			})
		})

		afterEach(async () => {
			await clearDatabaseStores()
			queryTracks.clear()
			vi.restoreAllMocks()
			vi.unstubAllGlobals()
		})

		it('saves final track to history when queue ends with repeat none', async () => {
			await seedTrack(1)

			using pl = createPlayerInRoot()
			const { player } = pl

			player.playTrack(0, [1])
			expectToBeDefined(audioInstance)

			const audio = audioWithCurrentTime(120)
			audio.onended?.()
			flushSync()

			const entries = await getPlayHistoryEntries()
			expect(entries).toHaveLength(1)

			expect(entries[0]?.trackId).toBe(1)
		})

		it('does not save final track when played time is below threshold', async () => {
			await seedTrack(2)

			using pl = createPlayerInRoot()
			const { player } = pl

			player.playTrack(0, [2])

			const audio = audioWithCurrentTime(10)
			audio.onended?.()
			flushSync()

			const entries = await getPlayHistoryEntries()
			expect(entries).toHaveLength(0)
		})

		it('does not save history on ended when repeat is one', async () => {
			await seedTrack(4)

			using pl = createPlayerInRoot()
			const { player } = pl

			player.playTrack(0, [4])
			flushSync()

			player.repeat = 'one'
			const audio = audioWithCurrentTime(179)
			audio.onended?.()
			flushSync()

			const entries = await getPlayHistoryEntries()
			expect(entries).toHaveLength(0)
		})

		it('saves history when queue is cleared while playing current track', async () => {
			await seedTrack(5)

			using pl = createPlayerInRoot()
			const { player } = pl

			player.playTrack(0, [5])
			flushSync()
			audioWithCurrentTime(90)

			player.clearQueue()
			flushSync()

			const entries = await getPlayHistoryEntries()
			expect(entries[0]?.trackId).toBe(5)
		})

		it('saves history when currently playing track is removed from queue', async () => {
			await seedTrack(6)

			using pl = createPlayerInRoot()
			const { player } = pl

			player.playTrack(0, [6, 999])
			flushSync()
			audioWithCurrentTime(90)

			player.removeFromQueue(0)
			flushSync()

			const entries = await getPlayHistoryEntries()
			expect(entries).toHaveLength(1)
			expect(entries[0]?.trackId).toBe(6)
		})

		it('does not save history for track removed from library', async () => {
			await seedTrack(7)
			await seedTrack(8)

			using pl = createPlayerInRoot()
			const { player } = pl

			player.playTrack(0, [7, 8, 999])
			flushSync()
			audioWithCurrentTime(90)

			await dbRemoveTrack(7)
			flushSync()

			const entries = await getPlayHistoryEntries()
			expect(entries).toHaveLength(0)
		})
	})

	describe('General behavior', () => {
		let mediaSession: {
			metadata: MediaMetadata | null
			setActionHandler: ReturnType<typeof vi.fn>
		}
		let audioInstance: MockAudio | undefined

		beforeEach(() => {
			mediaSession = {
				metadata: null,
				setActionHandler: vi.fn(),
			}
			audioInstance = undefined

			class AudioConstructor extends MockAudio {
				constructor() {
					super()
					audioInstance = this
				}
			}

			vi.stubGlobal('Audio', AudioConstructor)
			vi.stubGlobal('MediaMetadata', MediaMetadataMock)
			vi.stubGlobal('navigator', {
				mediaSession,
			})
			vi.stubGlobal('window', {
				navigator: {
					mediaSession,
				},
			})
			vi.stubGlobal('location', {
				origin: 'http://localhost',
			})
		})

		afterEach(() => {
			vi.restoreAllMocks()
			vi.unstubAllGlobals()
		})

		const getMediaActionHandler = (
			action:
				| 'play'
				| 'pause'
				| 'previoustrack'
				| 'nexttrack'
				| 'seekbackward'
				| 'seekforward',
		) => {
			const call = mediaSession.setActionHandler.mock.calls.find((c) => c[0] === action)
			expectToBeDefined(call)
			const handler = call[1]
			expectToBeDefined(handler)

			return handler
		}

		it('seekforward and seekbackward media actions clamp audio time', () => {
			createPlayerInRoot()

			expectToBeDefined(audioInstance)

			audioInstance.currentTime = 5
			audioInstance.duration = 15

			getMediaActionHandler('seekbackward')()
			expect(audioInstance.currentTime).toBe(0)

			getMediaActionHandler('seekforward')()
			expect(audioInstance.currentTime).toBe(10)

			getMediaActionHandler('seekforward')()
			expect(audioInstance.currentTime).toBe(15)
		})

		it('toggleRepeat cycles', () => {
			using pl = createPlayerInRoot()
			const { player } = pl
			player.repeat = 'none'

			expect(player.repeat).toBe('none')
			player.toggleRepeat()
			expect(player.repeat).toBe('all')
			player.toggleRepeat()
			expect(player.repeat).toBe('one')
			player.toggleRepeat()
			expect(player.repeat).toBe('none')
		})

		it('togglePlay does nothing when queue has no active track', () => {
			using pl = createPlayerInRoot()
			const { player } = pl

			expect(player.playing).toBe(false)
			player.togglePlay(true)
			expect(player.playing).toBe(false)
		})

		it('seek updates player and audio currentTime', () => {
			using pl = createPlayerInRoot()
			const { player } = pl
			expectToBeDefined(audioInstance)

			player.seek(42)

			expect(player.currentTime).toBe(42)
			expect(audioInstance.currentTime).toBe(42)
		})

		it('preservePitch updates audio pitch-preserve flags', () => {
			using pl = createPlayerInRoot()
			const { player } = pl
			expectToBeDefined(audioInstance)

			player.preservePitch = false
			flushSync()

			expect(audioInstance.preservesPitch).toBe(false)
			expect(audioInstance.mozPreservesPitch).toBe(false)
			expect(audioInstance.webkitPreservesPitch).toBe(false)
		})

		it('playTrack on same active track seeks to start', async () => {
			await seedTrack(3)
			using pl = createPlayerInRoot()
			const { player } = pl
			player.playTrack(0, [3])
			flushSync()

			expectToBeDefined(audioInstance)

			audioInstance.currentTime = 99
			player.playTrack(0)

			expect(player.currentTime).toBe(0)
			expect(audioInstance.currentTime).toBe(0)
		})
	})
})
