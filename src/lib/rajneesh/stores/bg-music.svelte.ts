import {
	BG_MUSIC_OPTIONS,
	getBgMusicVolume,
	getSelectedBgMusic,
	setBgMusicVolume,
	setSelectedBgMusic,
} from '$lib/rajneesh/pages/shorts/bg-music-state.ts'

export const bgMusicState = $state({
	selectedBgMusicId: 'none',
	bgMusicPlaying: false,
	bgVolume: 0.15,
})

const BG_AUDIO_OWNER_KEY = '__rajneesh_bg_audio_owner__'
type BgAudioOwnerGlobal = typeof globalThis & {
	[BG_AUDIO_OWNER_KEY]?: HTMLAudioElement
}

let bgAudio: HTMLAudioElement | null = null
let initialized = false
let bgMusicConsumerCount = 0

const claimBgAudio = (audio: HTMLAudioElement): void => {
	const globalState = globalThis as BgAudioOwnerGlobal
	const currentOwner = globalState[BG_AUDIO_OWNER_KEY]
	if (currentOwner && currentOwner !== audio) {
		currentOwner.pause()
		currentOwner.removeAttribute('src')
		currentOwner.load()
	}
	globalState[BG_AUDIO_OWNER_KEY] = audio
}

const releaseBgAudioClaim = (audio: HTMLAudioElement | null): void => {
	if (!audio) {
		return
	}

	const globalState = globalThis as BgAudioOwnerGlobal
	if (globalState[BG_AUDIO_OWNER_KEY] === audio) {
		delete globalState[BG_AUDIO_OWNER_KEY]
	}
}

const ensureInitialized = (): void => {
	if (initialized || typeof localStorage === 'undefined') {
		return
	}

	initialized = true
	bgMusicState.selectedBgMusicId = getSelectedBgMusic()
	bgMusicState.bgVolume = getBgMusicVolume()

	const globalState = globalThis as BgAudioOwnerGlobal
	const claimedAudio = globalState[BG_AUDIO_OWNER_KEY]
	if (claimedAudio) {
		bgAudio = claimedAudio
		bgAudio.volume = bgMusicState.bgVolume
		bgMusicState.bgMusicPlaying = !claimedAudio.paused
	}
}

const destroyBgAudio = (): void => {
	if (!bgAudio) {
		bgMusicState.bgMusicPlaying = false
		return
	}

	bgAudio.pause()
	bgAudio.removeAttribute('src')
	bgAudio.load()
	releaseBgAudioClaim(bgAudio)
	bgAudio = null
	bgMusicState.bgMusicPlaying = false
}

export const selectBgMusic = (id: string, isPlaying: boolean): void => {
	ensureInitialized()
	bgMusicState.selectedBgMusicId = id
	setSelectedBgMusic(id)
	destroyBgAudio()

	const option = BG_MUSIC_OPTIONS.find((item) => item.id === id)
	if (!option?.url || !isPlaying) {
		return
	}

	bgAudio = new Audio(option.url)
	bgAudio.loop = true
	bgAudio.volume = bgMusicState.bgVolume
	const activeAudio = bgAudio
	if (!activeAudio) {
		return
	}

	claimBgAudio(activeAudio)
	void activeAudio.play()
		.then(() => {
			bgMusicState.bgMusicPlaying = true
		})
		.catch(() => {
			bgMusicState.bgMusicPlaying = false
		})
}

export const syncBgMusic = (): void => {
	ensureInitialized()
	const option = BG_MUSIC_OPTIONS.find((item) => item.id === bgMusicState.selectedBgMusicId)
	if (!option?.url) {
		destroyBgAudio()
		return
	}

	if (!bgAudio) {
		bgAudio = new Audio(option.url)
		bgAudio.loop = true
		bgAudio.volume = bgMusicState.bgVolume
		claimBgAudio(bgAudio)
		bgAudio.addEventListener(
			'loadedmetadata',
			() => {
				if (bgAudio) {
					bgAudio.currentTime = Math.random() * bgAudio.duration
				}
			},
			{ once: true },
		)
	}

	const activeAudio = bgAudio
	if (!activeAudio) {
		return
	}

	claimBgAudio(activeAudio)
	void activeAudio.play()
		.then(() => {
			bgMusicState.bgMusicPlaying = true
		})
		.catch(() => {
			bgMusicState.bgMusicPlaying = false
		})
}

export const pauseBgMusic = (): void => {
	bgAudio?.pause()
	bgMusicState.bgMusicPlaying = false
}

export const updateBgMusicVolume = (volume: number): void => {
	ensureInitialized()
	bgMusicState.bgVolume = volume
	setBgMusicVolume(volume)
	if (bgAudio) {
		bgAudio.volume = volume
	}
}

export const initializeBgMusic = (): void => {
	ensureInitialized()
}

export const retainBgMusicConsumer = (): (() => void) => {
	bgMusicConsumerCount += 1

	return () => {
		bgMusicConsumerCount = Math.max(0, bgMusicConsumerCount - 1)
		if (bgMusicConsumerCount === 0) {
			destroyBgAudio()
		}
	}
}
