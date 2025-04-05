/// <reference lib='WebWorker' />

import { getDatabase } from '$lib/db/database'
import { type FileEntity, getFileHandlesRecursively } from '$lib/helpers/file-system'
import { dbRemoveTrack } from '$lib/library/tracks-actions.ts'
import { LEGACY_NO_NATIVE_DIRECTORY, type Track } from '$lib/library/types.ts'
import { importTrackToDb } from './import-track-to-db.ts'
import { parseTrack } from './parse/parse-track.ts'
import type { TracksScanMessage, TracksScanOptions } from './types.ts'

declare const self: DedicatedWorkerGlobalScope

interface ImportTrackOptions {
	unwrappedFile: File
	file: FileEntity
	directoryId: number
	/** In cases when track already was imported */
	trackId?: number
}

const importTrack = async (options: ImportTrackOptions): Promise<number | null> => {
	try {
		const metadata = await parseTrack(options.unwrappedFile)
		if (!metadata) {
			return null
		}

		const id = await importTrackToDb(
			{
				...metadata,
				file: options.file,
				directory: options.directoryId,
				fileName: options.file.name,
				lastScanned: Date.now(),
			},
			options.trackId,
		)

		return id
	} catch (err) {
		// We ignore errors and just skip the track.
		console.error(err)

		return null
	}
}

class StatusTracker {
	newlyImported = 0

	current = 0

	total = 0

	constructor(total: number) {
		this.total = total
	}

	sendMsg = (finished: boolean) => {
		const message: TracksScanMessage = {
			finished,
			count: {
				newlyImported: this.newlyImported,
				current: this.current,
				total: this.total,
			},
		}

		self.postMessage(message)
	}
}

const findTrackByFileHandle = async (handle: FileSystemFileHandle, tracks: Track[]) => {
	for (const track of tracks) {
		const isSame = await handle.isSameEntry(track.file as FileSystemFileHandle)
		if (isSame) {
			return track
		}
	}

	return null
}

const findTrackByMixedFileEntity = async (handle: FileEntity, tracks: Track[]) => {
	for (const track of tracks) {
		const existingFile = track.file
		// If file name is changed we can be sure it's not the same file anymore
		if (existingFile.name !== handle.name) {
			continue
		}

		// No reliable way to compare two Files,
		// so we compare their names and size
		if (
			existingFile instanceof File &&
			handle instanceof File &&
			existingFile.size === handle.size
		) {
			return track
		}

		if (
			existingFile instanceof FileSystemFileHandle &&
			handle instanceof FileSystemFileHandle
		) {
			const isSame = await handle.isSameEntry(existingFile)
			if (isSame) {
				return track
			}
		}
	}

	return null
}

const SUPPORTED_EXTENSIONS = ['aac', 'mp3', 'ogg', 'wav', 'flac', 'm4a', 'opus']

const scanExistingDirectory = async (handles: FileEntity[], directoryId: number) => {
	const db = await getDatabase()

	const tracker = new StatusTracker(handles.length)
	const scannedTracksIds = new Set<number>()

	const findTrackFn =
		directoryId === LEGACY_NO_NATIVE_DIRECTORY
			? findTrackByMixedFileEntity
			: findTrackByFileHandle

	console.time('SCAN_EXISTING_DIR')
	for (const handle of handles) {
		tracker.current += 1

		try {
			// Real FS might have multiple files with the same name
			// but in the database we keep flat structure
			const possibleExistingTracks = await db.getAllFromIndex('tracks', 'path', [
				directoryId,
				handle.name,
			])
			const existingTrack = await findTrackFn(
				// If `LEGACY_NO_NATIVE_DIRECTORY` is used this will be a `File`
				// in all other cases it will be a `FileSystemFileHandle`
				handle as FileSystemFileHandle,
				possibleExistingTracks,
			)

			const unwrappedFile = handle instanceof File ? handle : await handle.getFile()

			let existingTrackId = undefined
			if (existingTrack) {
				// File was not modified since last scan
				if (unwrappedFile.lastModified <= existingTrack.lastScanned) {
					scannedTracksIds.add(existingTrack.id)
					continue
				}

				existingTrackId = existingTrack.id
			}

			const trackId = await importTrack({
				unwrappedFile,
				file: handle,
				directoryId,
				trackId: existingTrackId,
			})

			if (trackId !== null) {
				scannedTracksIds.add(trackId)

				if (existingTrackId !== undefined) {
					tracker.newlyImported += 1
				}
			}
		} catch {
			// we ignore errors and just move on to the next track.
		}

		tracker.sendMsg(false)
	}

	// After importing is done, we remove tracks that were not scanned
	// meaning they do not exist in the actual FS anymore
	const tracksIdsInDirectory = await db.getAllKeysFromIndex('tracks', 'directory', directoryId)
	for (const trackId of tracksIdsInDirectory) {
		if (!scannedTracksIds.has(trackId)) {
			await dbRemoveTrack(trackId).catch(console.warn)
		}
	}
	console.timeEnd('SCAN_EXISTING_DIR')

	tracker.sendMsg(true)
}

const scanNewDirectory = async (files: FileEntity[], directoryId: number) => {
	const tracker = new StatusTracker(files.length)

	console.time('SCAN_NEW_DIR')
	for (const handle of files) {
		tracker.current += 1

		try {
			const unwrappedFile = handle instanceof File ? handle : await handle.getFile()
			const trackId = await importTrack({
				unwrappedFile,
				file: handle,
				directoryId,
				trackId: undefined,
			})

			if (trackId !== null) {
				tracker.newlyImported += 1
			}
		} catch {
			// we ignore errors and just move on to the next track
		}

		tracker.sendMsg(false)
	}
	console.timeEnd('SCAN_NEW_DIR')

	tracker.sendMsg(true)
}

self.addEventListener('message', async (event: MessageEvent<TracksScanOptions>) => {
	const options = event.data

	if (options.action === 'directory-add') {
		const handles = await getFileHandlesRecursively(options.dirHandle, SUPPORTED_EXTENSIONS)
		await scanNewDirectory(handles, options.dirId)

		return
	}

	if (options.action === 'directory-rescan') {
		const handles = await getFileHandlesRecursively(options.dirHandle, SUPPORTED_EXTENSIONS)
		await scanExistingDirectory(handles, options.dirId)

		return
	}

	if (options.action === 'legacy-files-migrate-from-v1') {
		await scanNewDirectory(options.files, LEGACY_NO_NATIVE_DIRECTORY)

		return
	}

	if (options.action === 'legacy-files-add') {
		await scanExistingDirectory(options.files, LEGACY_NO_NATIVE_DIRECTORY)

		return
	}
})
