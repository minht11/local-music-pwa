import type { FileEntity } from '$lib/helpers/file-system'

const getTrackFile = async (entity: FileEntity): Promise<File | null> => {
	if (entity instanceof File) {
		return entity
	}

	let mode = await entity.queryPermission({ mode: 'read' })
	if (mode !== 'granted') {
		try {
			// Request permission only when the browser can show the prompt.
			if (mode === 'prompt') {
				mode = await entity.requestPermission({ mode: 'read' })
			}
		} catch {
			// `requestPermission` requires a user activation; swallow the error
			// so the caller receives `null` rather than an unhandled rejection.
		}

		if (mode !== 'granted') {
			return null
		}
	}

	return entity.getFile()
}

export type AudioLoadResult = 'loaded' | 'superseded' | 'failed'

export class AudioLoader {
	loading: boolean = $state(false)

	#onSrc: (src: string | null) => void
	#currentSrc: string | null = null
	#current = 0

	constructor(onSrc: (src: string | null) => void) {
		this.#onSrc = onSrc
	}

	load = async (file: FileEntity): Promise<AudioLoadResult> => {
		this.#current += 1
		const gen = this.#current
		this.loading = true
		this.#clearSrc()

		const trackFile = await getTrackFile(file).catch(() => null)

		if (this.#current !== gen) {
			return 'superseded'
		}

		if (!trackFile) {
			this.loading = false
			return 'failed'
		}

		this.#currentSrc = URL.createObjectURL(trackFile)
		this.#onSrc(this.#currentSrc)
		this.loading = false
		return 'loaded'
	}

	reset = (): void => {
		this.#current += 1
		this.#clearSrc()
		this.loading = false
	}

	#clearSrc = (): void => {
		if (this.#currentSrc) {
			URL.revokeObjectURL(this.#currentSrc)
			this.#currentSrc = null
		}
		this.#onSrc(null)
	}
}
