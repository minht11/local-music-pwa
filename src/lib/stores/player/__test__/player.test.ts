import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDatabase } from '$lib/db/database.ts'
import { clearDatabaseStores, expectToBeDefined } from '$lib/helpers/test-helpers.ts'
import { LEGACY_NO_NATIVE_DIRECTORY } from '$lib/library/types.ts'
import { PlayerStore } from '$lib/stores/player/player.svelte.ts'

vi.mock('$lib/stores/main/use-store.ts', () => ({
	useMainStore: () => ({
		volumeSliderEnabled: true,
	}),
}))

vi.mock('$lib/helpers/persist.svelte.ts', () => ({
	persist: vi.fn(),
}))

class MediaMetadataMock {}

class MockAudio {
	src = ''
	paused = true
	currentTime = 0
	duration = 0
	volume = 1

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

const flush = async () => {
	await Promise.resolve()
	await Promise.resolve()
	await Promise.resolve()
}

const seedTrack = async (id: number) => {
	const db = await getDatabase()

	await db.add('tracks', {
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
	})
}

describe('PlayerStore play history', () => {
	let mediaSession: {
		metadata: MediaMetadata | null
		setActionHandler: ReturnType<typeof vi.fn>
	}
	let audioInstance: MockAudio | undefined

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
		vi.restoreAllMocks()
		vi.unstubAllGlobals()
	})

	it('saves final track to history when queue ends with repeat none', async () => {
		await seedTrack(1)
		const player = new PlayerStore()

		player.playTrack(0, [1])
		await flush()
		expectToBeDefined(audioInstance)

		audioInstance.currentTime = 120
		audioInstance.duration = 180
		audioInstance.onended?.()
		await flush()

		const db = await getDatabase()
		const entries = await db.getAll('playHistory')
		expect(entries).toHaveLength(1)
		expect(entries[0]?.trackId).toBe(1)
	})

	it('does not save final track when played time is below threshold', async () => {
		await seedTrack(2)
		const player = new PlayerStore()

		player.playTrack(0, [2])
		await flush()
		expectToBeDefined(audioInstance)

		audioInstance.currentTime = 10
		audioInstance.duration = 180
		audioInstance.onended?.()
		await flush()

		const db = await getDatabase()
		expect(await db.getAll('playHistory')).toHaveLength(0)
	})
})

describe('PlayerStore general behavior', () => {
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
		action: 'play' | 'pause' | 'previoustrack' | 'nexttrack' | 'seekbackward' | 'seekforward',
	) => {
		const call = mediaSession.setActionHandler.mock.calls.find((c) => c[0] === action)
		expectToBeDefined(call)
		const handler = call[1]
		expectToBeDefined(handler)

		return handler
	}

	it('seekforward and seekbackward media actions clamp audio time', () => {
		new PlayerStore()
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
		const player = new PlayerStore()

		expect(player.repeat).toBe('none')
		player.toggleRepeat()
		expect(player.repeat).toBe('all')
		player.toggleRepeat()
		expect(player.repeat).toBe('one')
		player.toggleRepeat()
		expect(player.repeat).toBe('none')
	})

	it('togglePlay does nothing when queue has no active track', () => {
		const player = new PlayerStore()

		expect(player.playing).toBe(false)
		player.togglePlay(true)
		expect(player.playing).toBe(false)
	})

	it('seek updates player and audio currentTime', () => {
		const player = new PlayerStore()
		expectToBeDefined(audioInstance)

		player.seek(42)

		expect(player.currentTime).toBe(42)
		expect(audioInstance.currentTime).toBe(42)
	})

	it('playTrack on same active track seeks to start', async () => {
		await seedTrack(3)
		const player = new PlayerStore()
		player.playTrack(0, [3])
		expectToBeDefined(audioInstance)

		audioInstance.currentTime = 99
		player.playTrack(0)

		expect(player.currentTime).toBe(0)
		expect(audioInstance.currentTime).toBe(0)
	})
})
