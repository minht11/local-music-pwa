/// <reference lib='WebWorker' />

import { importTrackToDb } from './import-track-to-db'
import { parseTrack } from './parse-track'
import type { TrackImportMessage } from './types'

declare const self: DedicatedWorkerGlobalScope

const importTrack = async (file: File | FileSystemFileHandle) => {
	try {
		const metadata = await parseTrack(file)

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

const processTracks = async (inputFiles: (File | FileSystemFileHandle)[]) => {
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
		const success = await importTrack(file)
		if (success) {
			imported += 1
		}

		current += 1
		sendMsg(false)
	}

	sendMsg(true)
	self.close()
}

self.addEventListener('message', (event: MessageEvent<(File | FileSystemFileHandle)[]>) => {
	processTracks(event.data)
})
