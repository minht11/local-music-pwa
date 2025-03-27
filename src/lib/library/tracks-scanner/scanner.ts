import type { TracksScanMessage, TracksScanOptions, TracksScanResult } from './worker/types.ts'
import TracksWorker from './worker/worker.ts?worker'

export type { TracksScanOptions, TracksScanResult } from './worker/types.ts'

export type TrackParsedFn = (totalParsedCount: number) => void

export const startTrackScanning = async (
	options: TracksScanOptions,
	progress: (data: TracksScanResult) => void,
): Promise<TracksScanResult> => {
	const { promise, reject, resolve } = Promise.withResolvers<TracksScanResult>()

	const worker = new TracksWorker()

	worker.addEventListener('error', reject)
	worker.addEventListener('message', ({ data }: MessageEvent<TracksScanMessage>) => {
		if (data.finished) {
			resolve(data.count)
		} else {
			progress(data.count)
		}
	})

	worker.postMessage(options)

	return promise
}
