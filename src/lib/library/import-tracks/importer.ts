import type { TrackImportCount, TrackImportMessage, TrackImportOptions } from './worker/types.ts'
import TracksWorker from './worker/worker.ts?worker'

export type TrackParsedFn = (totalParsedCount: number) => void

export const startImportingTracks = async (
	options: TrackImportOptions,
	progress: (data: TrackImportCount) => void,
): Promise<TrackImportCount> => {
	const { promise, reject, resolve } = Promise.withResolvers<TrackImportCount>()

	const worker = new TracksWorker()

	worker.addEventListener('error', reject)
	worker.addEventListener('message', ({ data }: MessageEvent<TrackImportMessage>) => {
		if (data.finished) {
			resolve(data.count)
		} else {
			progress(data.count)
		}
	})

	worker.postMessage(options)

	return promise
}
