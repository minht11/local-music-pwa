import { snackbar } from '$lib/components/snackbar/snackbar.ts'
import type { TracksScanOptions } from './scanner/start.ts'

export const scanTracks = async (options: TracksScanOptions): Promise<void> => {
	const snackbarId = 'scan-tracks'
	snackbar({
		id: snackbarId,
		message: m.settingsPreparingForScan(),
		controls: false,
		duration: false,
	})

	const { startTrackScannerWorker } = await import('./scanner/start.ts')

	const result = await startTrackScannerWorker(options, (data) => {
		snackbar({
			id: snackbarId,
			message: m.settingsScanInProgress({
				current: data.current,
				total: data.total,
			}),
			duration: false,
		})
	})

	if (result.newlyImported === 0) {
		snackbar({
			id: snackbarId,
			message: m.settingsScanNoNewTracks(),
			duration: 2000,
		})
	} else {
		snackbar({
			id: snackbarId,
			message: m.settingsScanNewOrUpdatedTracks({
				newTracks: result.newlyImported,
			}),
			duration: 8000,
		})
	}
}
