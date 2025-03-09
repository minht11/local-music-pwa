import { snackbar } from '$lib/components/snackbar/snackbar.ts'
import { startImportingTracks } from './importer.ts'
import type { TrackImportOptions } from './worker/types.ts'

export type { TrackImportOptions }

export const importTracksFromDirectory = async (options: TrackImportOptions): Promise<void> => {
	const snackbarId = 'import-tracks'
	snackbar({
		id: snackbarId,
		message: 'Preparing to import tracks to the library.',
		controls: false,
		duration: false,
	})

	try {
		const finishedData = await startImportingTracks(options, (data) => {
			snackbar({
				id: snackbarId,
				message: `Scanning tracks. ${data.current} of ${data.total}`,
				controls: 'spinner',
				duration: false,
			})
		})

		if (finishedData.total === 0) {
			snackbar({
				id: snackbarId,
				message: 'No new tracks found in the selected directory.',
				duration: 8000,
				controls: false,
			})
			return
		}

		snackbar({
			id: snackbarId,
			message: `Successfully imported ${finishedData.newlyImported} new tracks to the library.`,
			duration: 8000,
			controls: false,
		})
	} catch (err) {
		console.error(err)
		snackbar({
			id: snackbarId,
			message: 'An unknown error has occurred while importing tracks to the library.',
			duration: false,
		})
	}
}
