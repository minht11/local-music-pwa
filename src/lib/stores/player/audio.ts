import type { FileEntity } from '$lib/helpers/file-system'
import { throttle } from '$lib/helpers/utils'

export type PlayerRepeat = 'none' | 'one' | 'all'

const getTrackFile = async (track: FileEntity) => {
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

export const cleanupTrackAudio = (audio: HTMLAudioElement) => {
	const currentSrc = audio.src
	if (currentSrc) {
		URL.revokeObjectURL(currentSrc)
	}
}

export const loadTrackAudio = async (audio: HTMLAudioElement, entity: FileEntity) => {
	const file = await getTrackFile(entity)

	if (!file) {
		return
	}

	cleanupTrackAudio(audio)

	audio.src = URL.createObjectURL(file)

	await audio.play()
}
