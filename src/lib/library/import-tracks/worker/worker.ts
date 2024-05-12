/// <reference lib='WebWorker' />

import { LegacyDirectoryId, MusicItemType, type Track } from '$lib/db/entities'
import { getDB } from '$lib/db/get-db'
import { type FileEntity, getFileHandlesRecursively } from '$lib/helpers/file-system'
import { removeTrack } from '$lib/library/tracks.svelte'
import { importTrackToDb } from './import-track-to-db.ts'
import { parseTrack } from './parse/parse-track.ts'
import type { TrackImportCount, TrackImportMessage, TrackImportOptions } from './types'

declare const self: DedicatedWorkerGlobalScope

interface ImportTrackOptions {
	unwrappedFile: File
	file: FileEntity
	directoryId: number
	/** In cases when track already was imported */
	trackId?: number
}

const importTrack = async (options: ImportTrackOptions) => {
	try {
		const metadata = await parseTrack(options.unwrappedFile)

		if (!metadata) {
			return false
		}

		await importTrackToDb(
			{
				...metadata,
				type: MusicItemType.Track,
				file: options.file,
				directory: options.directoryId,
				lastScanned: Date.now(),
			},
			options.trackId,
		)

		return true
	} catch (err) {
		// We ignore errors and just skip the track.
		console.error(err)

		return false
	}
}

// const processTracks = async (inputFiles: FileEntity[], directoryId: number) => {
// 	let imported = 0
// 	let current = 0

// const sendMsg = (finished: boolean) => {
// 	const message: TrackImportMessage = {
// 		finished,
// 		count: {
// 			imported,
// 			current,
// 			total: inputFiles.length,
// 		},
// 	}

// 	self.postMessage(message)
// }

// 	for (const file of inputFiles) {
// 		const success = await importTrack(file, directoryId)
// 		if (success) {
// 			imported += 1
// 		}

// 		current += 1
// 		sendMsg(false)
// 	}

// 	sendMsg(true)
// 	self.close()
// }

const findTrackByFileHandle = async (handle: FileSystemFileHandle, tracks: Set<Track>) => {
	for (const track of tracks) {
		if (track.file.name === handle.name) {
			const isSame = await handle.isSameEntry(track.file as FileSystemFileHandle)

			if (isSame) {
				return track
			}
		}
	}

	return null
}
const processDirectory = async (newDirHandle: FileSystemDirectoryHandle, directoryId: number) => {
	const db = await getDB()
	const tx = db.transaction(['directories', 'tracks'], 'readwrite')
	const existingTracks = await tx.objectStore('tracks').index('directory').getAll(directoryId)

	// TODO. Add more extensions
	const handles = await getFileHandlesRecursively(newDirHandle, ['mp3'])

	const count: TrackImportCount = {
		newlyImported: 0,
		existingUpdated: 0,
		removed: 0,
		current: 0,
		total: handles.length,
	}

	const sendMsg = (finished: boolean) => {
		const message: TrackImportMessage = {
			finished,
			count,
		}

		self.postMessage(message)
	}

	const existingTrackSet = new Set(existingTracks)

	for (const handle of handles) {
		// TODO. This whole block should be wrapped in a try-catch block.
		const existingTrack = await findTrackByFileHandle(handle, existingTrackSet)

		const unwrappedFile = handle instanceof File ? handle : await handle.getFile()
		let existingTrackId = undefined

		if (existingTrack) {
			existingTrackSet.delete(existingTrack)

			// We only scan files that have been modified since the last scan.
			if (unwrappedFile.lastModified <= existingTrack.lastScanned) {
				continue
			}

			existingTrackId = existingTrack.id
		}

		const success = await importTrack({
			unwrappedFile,
			file: handle,
			directoryId,
			trackId: existingTrackId,
		})

		if (success) {
			if (existingTrackId) {
				count.existingUpdated += 1
			} else {
				count.newlyImported += 1
			}
		}

		sendMsg(false)

		count.current += 1
	}

	// If we have any tracks left in the set,
	// that means they no longer exist in the directory, so we remove them.
	for (const track of existingTrackSet) {
		await removeTrack(track.id).catch(console.warn)
		count.removed += 1
	}

	sendMsg(true)
}

self.addEventListener('message', async (event: MessageEvent<TrackImportOptions>) => {
	const options = event.data

	if (options.action === 'directory-replace' || options.action === 'directory-add') {
		// TODO.
		await processDirectory(options.dirHandle, options.dirId ?? LegacyDirectoryId.File)
	} else {
		throw new Error('Unsupported action')
	}
})
