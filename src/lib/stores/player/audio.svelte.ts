import type { FileEntity } from '$lib/helpers/file-system'

export class PlayerAudio {
	playing = $state(false)

	#audio = new Audio()

	constructor() {
		$effect(() => {
			// If audio state matches our state
			// we do not need to do anything
			if (this.#audio.paused === !this.playing) {
				return
			}

			void this.#audio[this.playing ? 'play' : 'pause']()
		})

		this.#audio.addEventListener('pause', this.#onAudioPlayPauseHandler)
		this.#audio.addEventListener('play', this.#onAudioPlayPauseHandler)
	}

	#onAudioPlayPauseHandler = () => {
		const currentAudioState = !this.#audio.paused

		// If our state is out of sync with audio element, sync it.
		if (currentAudioState !== this.playing) {
			this.playing = currentAudioState
		}
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

		// await this.#audio.pause()

		this.#cleanupSource()

		this.#audio.src = URL.createObjectURL(file)

		if (this.playing) {
			await this.#audio.play()
		}
	}

	reset() {
		// if (!this.#audio.src) {
		// 	return
		// }
		// this.#cleanupSource()
		// this.#audio.src = ''
	}
}
