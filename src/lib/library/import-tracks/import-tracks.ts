import { snackbar } from '$lib/components/snackbar/snackbar'
import { getFilesFromDirectory } from '$lib/helpers/file-system'
import { startImportingTracks } from './importer'

export const importTracks = async () => {
	const files = await getFilesFromDirectory(['aac', 'mp3', 'ogg', 'wav', 'flac', 'm4a'])

	// User canceled directory picker.
	if (!files) {
		return
	}

	if (files.length < 1) {
		snackbar({
			id: 'import-tracks-no-tracks',
			message: 'Selected directory does not contain any tracks.',
		})
		return
	}

	const snackbarId = 'import-tracks'
	snackbar({
		id: snackbarId,
		message: 'Preparing to import tracks to the library.',
		controls: false,
		duration: false,
	})

	try {
		const finishedData = await startImportingTracks(files, (data) => {
			snackbar({
				id: snackbarId,
				message: `Scanning tracks. ${data.current} of ${data.total}`,
				controls: 'spinner',
				duration: false,
			})
		})

		snackbar({
			id: snackbarId,
			message: `Successfully imported ${finishedData.imported} new tracks to the library.`,
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
