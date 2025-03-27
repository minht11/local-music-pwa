import { snackbar } from '$lib/components/snackbar/snackbar.ts'
import type { TracksScanOptions } from '$lib/library/tracks-scanner/scanner.ts'

export const scanTracks = async (options: TracksScanOptions): Promise<void> => {
	const snackbarId = 'scan-tracks'
	snackbar({
		id: snackbarId,
		message: m.settingsPreparingForScan(),
		controls: false,
		duration: false,
	})

	const { startTrackScanning } = await import(
		'$lib/library/tracks-scanner/scanner.ts'
	)

	const result = await startTrackScanning(options, (data) => {
		snackbar({
			id: snackbarId,
			message: m.settingsScanningTracks({
				current: data.current,
				total: data.total,
			}),
			controls: 'spinner',
			duration: false,
		})
	})

	if (result.newlyImported === 0) {
		snackbar({
			id: snackbarId,
			message: m.settingsScanNoNewTracks(),
			duration: 2000,
			controls: false,
		})
	} else {
		snackbar({
			id: snackbarId,
			message: m.settingsScanNewOrUpdatedTracks({
				newTracks: result.newlyImported,
			}),
			duration: 8000,
			controls: false,
		})
	}
}
