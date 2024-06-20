import type { FileEntity } from '$lib/helpers/file-system'
import { persist } from '$lib/helpers/persist.svelte.ts'
import { throttle } from '$lib/helpers/utils'
import { useMainStore } from '../main-store.svelte'

export class PlayerAudio {
	#main = useMainStore()

	playing = $state(false)

	#audio = new Audio()

	time = $state({
		current: 0,
		duration: 0,
	})

	#volume = $state(100)

	get volume() {
		if (!this.#main.volumeSliderEnabled) {
			return 100
		}

		return this.#volume
	}

	set volume(value: number) {
		this.#volume = value
	}

	muted = $state(false)

	constructor() {
		persist('player-audio', this, ['volume'])

		const audio = this.#audio

		$effect(() => {
			// If audio state matches our state
			// we do not need to do anything
			if (audio.paused === !this.playing) {
				return
			}

			void audio[this.playing ? 'play' : 'pause']()
		})

		const onAudioPlayPauseHandler = () => {
			const currentAudioState = !audio.paused

			if (currentAudioState !== this.playing) {
				// If our state is out of sync with audio element, sync it.
				this.playing = currentAudioState
			}
		}

		audio.onpause = onAudioPlayPauseHandler
		audio.onplay = onAudioPlayPauseHandler

		audio.ondurationchange = () => {
			this.time.duration = audio.duration
		}

		audio.ontimeupdate = throttle(() => {
			this.time.current = audio.currentTime
		}, 1000)

		$effect(() => {
			// Humans perceive volume logarithmically
			// so we adjust the volume to match that perception
			const k = 0.5
			audio.volume = (this.volume / 100) ** k
		})
	}

	#getTrackFile = async (track: FileEntity) => {
		if (track instanceof File) {
			return track
		}

		let mode = await track.queryPermission({ mode: 'read' })
		if (mode !== 'granted') {
			try {
				// Try to request permission if it's not denied.
				if (mode === 'prompt') {
					mode = await track.requestPermission({ mode: 'read' })
				}
			} catch {
				// User activation is required to request permission. Catch the error.
			}

			if (mode !== 'granted') {
				return null
			}
		}

		return track.getFile()
	}

	#cleanupSource = () => {
		const currentSrc = this.#audio.src
		if (currentSrc) {
			URL.revokeObjectURL(currentSrc)
		}
	}

	load = async (entity: FileEntity) => {
		const file = await this.#getTrackFile(entity)

		if (!file) {
			return
		}

		this.#cleanupSource()

		this.#audio.src = URL.createObjectURL(file)

		await this.#audio.play()
	}

	reset() {
		if (!this.#audio.src) {
			return
		}
		this.#cleanupSource()
		this.#audio.src = ''
	}

	seek = (time: number) => {
		this.#audio.currentTime = time
		this.time.current = time
	}
}
