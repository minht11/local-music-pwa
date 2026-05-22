import { getTrackFile } from '$lib/helpers/file-access'
import type { FileEntity } from '$lib/helpers/file-system'

export class AudioLoader {
	loading: boolean = $state(false)

	#onSrc: (src: string | null) => void
	#currentSrc: string | null = null
	#current = 0

	constructor(onSrc: (src: string | null) => void) {
		this.#onSrc = onSrc
	}

	load = async (directoryId: number, file: FileEntity) => {
		this.#current += 1
		const gen = this.#current
		this.loading = true
		this.#clearSrc()

		const { status: trackStatus, file: trackFile } = await getTrackFile(directoryId, file)
		if (this.#current !== gen) {
			return { status: 'superseded' } as const
		}

		if (trackStatus !== 'loaded') {
			this.loading = false

			return { status: 'failed', reason: trackStatus } as const
		}

		this.#currentSrc = URL.createObjectURL(trackFile)
		this.#onSrc(this.#currentSrc)
		this.loading = false
		return { status: 'loaded' } as const
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
