/// <reference lib='WebWorker' />

import type { Directory, Track } from '$lib/db/entities'
import { getDB } from '$lib/db/get-db'
import { type FileEntity, getFileHandlesRecursively } from '$lib/helpers/file-system'
import { removeTrack } from '$lib/library/tracks.svelte'
import { importTrackToDb } from './import-track-to-db.ts'
import { parseTrack } from './parse/parse-track.ts'
import type { TrackImportMessage, TrackImportOptions } from './types'

declare const self: DedicatedWorkerGlobalScope

const importTrack = async (file: File | FileSystemFileHandle, directoryId: number) => {
	try {
		const metadata = await parseTrack(file, directoryId)

		if (!metadata) {
			return false
		}

		await importTrackToDb(metadata)

		return true
	} catch (err) {
		// We ignore errors and just skip the track.
		console.error(err)

		return false
	}
}

const processTracks = async (inputFiles: FileEntity[], directoryId: number) => {
	let imported = 0
	let current = 0

	const sendMsg = (finished: boolean) => {
		const message: TrackImportMessage = {
			finished,
			count: {
				imported,
				current,
				total: inputFiles.length,
			},
		}

		self.postMessage(message)
	}

	for (const file of inputFiles) {
		const success = await importTrack(file, directoryId)
		if (success) {
			imported += 1
		}

		current += 1
		sendMsg(false)
	}

	sendMsg(true)
	self.close()
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

const benchmark22 = async (existingTracks: Track[], files: FileSystemFileHandle[]) => {
	const existingTrackSet = new Set(existingTracks)

	for (const newFile of files) {
		const existingTrack = await findTrackByFileHandle(newFile, existingTrackSet)

		if (existingTrack) {
			existingTrackSet.delete(existingTrack)
		} else {
		}
	}

	// If we have any tracks left in the set,
	// that means they no longer exist in the directory, so we remove them.
	for (const track of existingTrackSet) {
		await removeTrack(track.id)
	}
}

const processDirectory = async (directory: Directory) => {
	const db = await getDB()
	const tx = db.transaction(['directories', 'tracks'], 'readwrite')
	const existingTracks = await tx.objectStore('tracks').index('directory').getAll(directory.id)
	const existingTrackSet = new Set(existingTracks)

	console.log(existingTracks)

	// const foundIndexes: string[] = []

	// const metadata = existingTracks.map((track) => {
	// 	const file = track.file as FileSystemFileHandle

	// 	return {
	// 		name: file.name,
	// 	}
	// })

	// for (const existingTrack of existingTracks) {
	// 	existingTracks
	// }

	// TODO. Add more extensions
	const files = await getFileHandlesRecursively(directory.handle, ['mp3'])

	processTracks(files, directory.id)
}

const processDirectory2 = async (
	newDirHandle: FileSystemDirectoryHandle,
	existingDirId?: number,
) => {
	const db = await getDB()
	const tx = db.transaction(['directories', 'tracks'], 'readwrite')
	const existingTracks = await tx.objectStore('tracks').index('directory').getAll(existingDirId)

	// TODO. Add more extensions
	const handles = await getFileHandlesRecursively(newDirHandle, ['mp3'])

	const existingTrackSet = new Set(existingTracks)

	for (const handle of handles) {
		const existingTrack = await findTrackByFileHandle(handle, existingTrackSet)

		if (existingTrack) {
			existingTrackSet.delete(existingTrack)
			processTracks
		} else {
		}
	}

	// If we have any tracks left in the set,
	// that means they no longer exist in the directory, so we remove them.
	for (const track of existingTrackSet) {
		await removeTrack(track.id)
	}
}

self.addEventListener('message', async (event: MessageEvent<TrackImportOptions>) => {
	const options = event.data

	if (options.action === 'directory-replace' || options.action === 'directory-add') {
		await processDirectory2(options.newDirHandle, options.existingDirId)
	}
})
