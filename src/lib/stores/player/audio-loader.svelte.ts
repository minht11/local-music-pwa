import { getDatabase } from '$lib/db/database'
import type { FileEntity } from '$lib/helpers/file-system'
import { isAndroid, isChromiumBased } from '$lib/helpers/utils/ua'

const requestPermission = async (handle: FileSystemHandle) => {
	let mode = await handle.queryPermission({ mode: 'read' })

	if (mode === 'prompt') {
		try {
			mode = await handle.requestPermission({ mode: 'read' })
		} catch {
			// `requestPermission` requires a user activation; so swallow the error
			// and treat it as a denial of permission.
		}
	}

	if (mode === 'granted') {
		return 'granted'
	}

	return 'denied'
}

const getTrackFileRegular = async (entity: FileSystemFileHandle): Promise<File | null> => {
	const permission = await requestPermission(entity)
	if (permission === 'denied') {
		return null
	}

	return entity.getFile()
}

const getTrackFileWorkaroundForAndroid = async (directoryId: number, fileName: string) => {
	const db = await getDatabase()
	const dir = await db.get('directories', directoryId)
	if (!dir) {
		return null
	}

	const permission = await requestPermission(dir.handle)
	if (permission === 'denied') {
		return null
	}

	const fileHandle = await dir.handle.getFileHandle(fileName)

	return fileHandle.getFile()
}

const getTrackFile = async (directoryId: number, entity: FileEntity) => {
	try {
		let trackFile: File | null = null

		if (entity instanceof File) {
			trackFile = entity
		}
		// Android on Chromium based browsers has a regression where persisted FileSystemFileHandles
		// fail with net:ERR_FILE_NOT_FOUND when used with URL.createObjectURL.
		// https://issues.chromium.org/issues/499064852
		else if (isAndroid() && isChromiumBased()) {
			trackFile = await getTrackFileWorkaroundForAndroid(directoryId, entity.name)
		} else {
			trackFile = await getTrackFileRegular(entity)
		}

		if (trackFile) {
			return { status: 'loaded', file: trackFile } as const
		}

		return { status: 'permission-denied' } as const
	} catch (error) {
		if (error instanceof DOMException && error.name === 'NotFoundError') {
			return { status: 'not-found' } as const
		}

		console.error('Error loading track file:', error)

		return { status: 'error' } as const
	}
}

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
