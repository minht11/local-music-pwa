import { browser } from '$app/env'
import type { TracksScanMessage, TracksScanOptions, TracksScanResult } from './types.ts'

export type {
	/** @public */
	TracksScanOptions,
	/** @public */
	TracksScanResult,
} from './types.ts'

/** @public */
export type TrackParsedFn = (totalParsedCount: number) => void

/** @public */
export const startTrackScannerWorker = (
	options: TracksScanOptions,
	progress: (data: TracksScanResult) => void,
): Promise<TracksScanResult> => {
	if (!browser) {
		// Prevent SSR build processing worker code
		throw new Error('startTrackScannerWorker is only available in the browser')
	}

	const { promise, reject, resolve } = Promise.withResolvers<TracksScanResult>()

	const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })

	worker.addEventListener('error', reject)
	worker.addEventListener('message', ({ data }: MessageEvent<TracksScanMessage>) => {
		if (data.finished) {
			worker.terminate()
			resolve(data.count)
		} else {
			progress(data.count)
		}
	})

	worker.postMessage(options)

	return promise
}
