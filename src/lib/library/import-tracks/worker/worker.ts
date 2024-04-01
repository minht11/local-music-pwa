/// <reference lib='WebWorker' />

import type { Directory } from '$lib/db/entities'
import { getFileHandlesRecursively } from '$lib/helpers/file-system'
import { importTrackToDb } from './import-track-to-db'
import { parseTrack } from './parse-track'
import type { TrackImportMessage } from './types'

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

const processTracks = async (inputFiles: (File | FileSystemFileHandle)[], directoryId: number) => {
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

	for await (const file of inputFiles) {
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

const processDirectory = async (directory: Directory) => {
	// TODO. Add more extensions
	const files = await getFileHandlesRecursively(directory.handle, ['mp3'])

	processTracks(files, directory.id)
}

self.addEventListener('message', async (event: MessageEvent<Directory>) => {
	await processDirectory(event.data)
})
