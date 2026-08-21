import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MediaSessionController } from '../media-session.svelte.ts'

const ACTIONS = [
	'play',
	'pause',
	'nexttrack',
	'previoustrack',
	'seekbackward',
	'seekforward',
	'seekto',
] as const satisfies readonly MediaSessionAction[]

const player = {
	activeTrack: undefined,
	artworkSrc: undefined,
	playing: false,
	currentTime: 0,
	duration: 0,
	playbackRate: 1,
	play: vi.fn(),
	pause: vi.fn(),
	seek: vi.fn(),
	playNext: vi.fn(),
	playPrev: vi.fn(),
}

let originalMediaSession: PropertyDescriptor | undefined
let mediaSession: MediaSession
let setActionHandler: ReturnType<typeof vi.fn>

beforeEach(() => {
	originalMediaSession = Object.getOwnPropertyDescriptor(navigator, 'mediaSession')
	setActionHandler = vi.fn()
	mediaSession = {
		metadata: {} as MediaMetadata,
		playbackState: 'playing',
		setActionHandler,
		setPositionState: vi.fn(),
	} as unknown as MediaSession
	Object.defineProperty(navigator, 'mediaSession', {
		configurable: true,
		value: mediaSession,
	})
})

afterEach(() => {
	if (originalMediaSession) {
		Object.defineProperty(navigator, 'mediaSession', originalMediaSession)
	} else {
		Reflect.deleteProperty(navigator, 'mediaSession')
	}
	vi.clearAllMocks()
})

describe('MediaSessionController', () => {
	it('removes its global handlers and presentation state on dispose', () => {
		let controller!: MediaSessionController
		const cleanup = $effect.root(() => {
			controller = new MediaSessionController(player)
		})

		controller.dispose()

		for (const action of ACTIONS) {
			expect(setActionHandler).toHaveBeenCalledWith(action, null)
		}
		expect(mediaSession.metadata).toBeNull()
		expect(mediaSession.playbackState).toBe('none')

		controller.dispose()
		expect(setActionHandler).toHaveBeenCalledTimes(ACTIONS.length * 2)
		cleanup()
	})
})
