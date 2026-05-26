import { getDatabase } from '$lib/db/database'
import type { FileEntity } from '$lib/helpers/file-system'
import { isAndroid, isChromiumBased } from '$lib/helpers/utils/ua'

/** @public */
export type FileLoadFailReason = 'permission-denied' | 'not-found' | 'error'

/** @public */
export type ResolveResult = { status: 'loaded'; file: File } | { status: FileLoadFailReason }

const requestPermission = async (
	handle: FileSystemHandle,
	askPermission: boolean,
): Promise<'granted' | 'denied'> => {
	let mode = await handle.queryPermission({ mode: 'read' })

	if (mode === 'prompt' && askPermission) {
		try {
			mode = await handle.requestPermission({ mode: 'read' })
		} catch (error) {
			// requestPermission requires a user activation.
			// Swallow and treat as denial.
			console.error('[file-resolver] requestPermission error:', error)
		}
	}

	return mode === 'granted' ? 'granted' : 'denied'
}

const resolveRegular = async (
	entity: FileSystemFileHandle,
	askPermission: boolean,
): Promise<File | null> => {
	const permission = await requestPermission(entity, askPermission)
	if (permission === 'denied') {
		return null
	}

	return entity.getFile()
}

/**
 * Android Chromium regression: persisted FileSystemFileHandles fail with
 * net:ERR_FILE_NOT_FOUND when used with URL.createObjectURL.
 * Workaround: re-acquire the handle from the parent directory.
 * https://issues.chromium.org/issues/499064852
 */
const resolveAndroidWorkaround = async (
	directoryId: number,
	fileName: string,
	askPermission: boolean,
): Promise<File | null> => {
	const db = await getDatabase()
	const dir = await db.get('directories', directoryId)
	if (!dir) {
		return null
	}

	const permission = await requestPermission(dir.handle, askPermission)
	if (permission === 'denied') {
		return null
	}

	const fileHandle = await dir.handle.getFileHandle(fileName)
	return fileHandle.getFile()
}

interface ResolveTrackFileOptions {
	directoryId: number
	entity: FileEntity
	askPermission: boolean
}

/**
 * Resolves a FileEntity (FileSystemFileHandle, legacy File, etc.) to a File.
 * Handles permission prompts and so on.
 * @public
 */
export const resolveTrackFile = async (
	options: ResolveTrackFileOptions,
): Promise<ResolveResult> => {
	const { directoryId, entity, askPermission } = options
	try {
		let file: File | null = null

		if (entity instanceof File) {
			file = entity
		} else if (isAndroid() && isChromiumBased()) {
			file = await resolveAndroidWorkaround(directoryId, entity.name, askPermission)
		} else {
			file = await resolveRegular(entity, askPermission)
		}

		if (file) {
			return { status: 'loaded', file }
		}

		return { status: 'permission-denied' }
	} catch (error) {
		if (error instanceof DOMException && error.name === 'NotFoundError') {
			return { status: 'not-found' }
		}
		console.error('[resolveTrackFile]', error)
		return { status: 'error' }
	}
}
