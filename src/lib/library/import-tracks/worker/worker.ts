/// <reference lib='WebWorker' />

import type { Track } from '$lib/db/database-types.ts'
import { getDB } from '$lib/db/get-db'
import { type FileEntity, getFileHandlesRecursively } from '$lib/helpers/file-system'
import { removeTrackWithTx } from '$lib/library/tracks.svelte'
import { importTrackToDb } from './import-track-to-db.ts'
import { parseTrack } from './parse/parse-track.ts'
import type { TrackImportMessage, TrackImportOptions } from './types.ts'

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

class StatusTracker {
	newlyImported = 0

	existingUpdated = 0

	removed = 0

	current = 0

	total = 0

	constructor(total: number) {
		this.total = total
	}

	sendMsg = (finished: boolean) => {
		const message: TrackImportMessage = {
			finished,
			count: {
				newlyImported: this.newlyImported,
				existingUpdated: this.existingUpdated,
				removed: this.removed,
				current: this.current,
				total: this.total,
			},
		}

		self.postMessage(message)
	}
}

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

const scanExistingDirectory = async (
	newDirHandle: FileSystemDirectoryHandle,
	directoryId: number,
) => {
	const db = await getDB()

	// TODO. Add more extensions
	const handles = await getFileHandlesRecursively(newDirHandle, ['mp3'])
	const tracker = new StatusTracker(handles.length)

	const existingTracks = new Set(
		// We do not use one transaction for all operations to commit changes in smaller chunks.
		await db.getAllFromIndex('tracks', 'directory'),
	)

	for (const handle of handles) {
		try {
			// TODO. This whole block should be wrapped in a try-catch block.
			const existingTrack = await findTrackByFileHandle(handle, existingTracks)
			const unwrappedFile = handle instanceof File ? handle : await handle.getFile()

			let existingTrackId = undefined
			if (existingTrack) {
				existingTracks.delete(existingTrack)

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
					tracker.existingUpdated += 1
				} else {
					tracker.newlyImported += 1
				}
			}
		} catch {
			// we ignore errors and just move on to the next track.
		}

		tracker.sendMsg(false)

		tracker.current += 1
	}

	const tx = db.transaction(
		['directories', 'tracks', 'albums', 'artists', 'playlistsTracks'],
		'readwrite',
	)
	// If we have any tracks left in the set,
	// that means they no longer exist in the directory, so we remove them.
	for (const track of existingTracks) {
		await removeTrackWithTx(tx, track.id).catch(console.warn)
		tracker.removed += 1
	}

	tracker.sendMsg(true)
}

const scanNewDirectory = async (newDirHandle: FileSystemDirectoryHandle, directoryId: number) => {
	// TODO. Add more extensions
	const handles = await getFileHandlesRecursively(newDirHandle, ['mp3'])

	const tracker = new StatusTracker(handles.length)

	for (const handle of handles) {
		tracker.current += 1

		const unwrappedFile = await handle.getFile()

		const success = await importTrack({
			unwrappedFile,
			file: handle,
			directoryId,
			trackId: undefined,
		})

		if (success) {
			tracker.newlyImported += 1
		}

		tracker.sendMsg(false)
	}

	tracker.sendMsg(true)
}

self.addEventListener('message', async (event: MessageEvent<TrackImportOptions>) => {
	const options = event.data

	if (options.action === 'directory-add') {
		await scanNewDirectory(options.dirHandle, options.dirId)
	} else if (options.action === 'directory-rescan') {
		await scanExistingDirectory(options.dirHandle, options.dirId)
	} else {
		throw new Error('Unsupported action')
	}
})
