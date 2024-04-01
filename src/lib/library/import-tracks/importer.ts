import type { Directory } from '$lib/db/entities'
import type { TrackImportCount, TrackImportMessage } from './worker/types'

export type TrackParsedFn = (totalParsedCount: number) => void

export const startImportingTracks = async (
	directory: Directory,
	progress: (data: TrackImportCount) => void,
) => {
	const { promise, reject, resolve } = Promise.withResolvers<TrackImportCount>()

	const worker = new Worker(new URL('./worker/worker.ts', import.meta.url), {
		type: 'module',
	})

	worker.addEventListener('error', reject)
	worker.addEventListener('message', ({ data }: MessageEvent<TrackImportMessage>) => {
		if (data.finished) {
			resolve(data.count)
		} else {
			progress(data.count)
		}
	})

	worker.postMessage(directory)

	return promise
}
