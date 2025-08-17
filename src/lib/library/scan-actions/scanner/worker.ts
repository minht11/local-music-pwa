/// <reference lib='WebWorker' />

import { workerAction } from './actions.ts'
import type { TracksScanOptions } from './types.ts'

declare const self: DedicatedWorkerGlobalScope

self.addEventListener('message', async (event: MessageEvent<TracksScanOptions>) => {
	const options = event.data

	await workerAction(options)
})
