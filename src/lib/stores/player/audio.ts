import type { FileEntity } from '$lib/helpers/file-system'

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

export const cleanupTrackAudio = (audio: HTMLAudioElement): void => {
	const currentSrc = audio.src
	if (currentSrc) {
		URL.revokeObjectURL(currentSrc)
	}
}

export const loadTrackAudio = async (
	audio: HTMLAudioElement,
	entity: FileEntity,
): Promise<boolean> => {
	const file = await getTrackFile(entity)
	cleanupTrackAudio(audio)

	if (!file) {
		return false
	}

	audio.src = URL.createObjectURL(file)

	return true
}
