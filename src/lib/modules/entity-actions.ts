import { toast } from '~/components/toast/toast'
import { getFilesFromDirectory } from '~/helpers/file-system'
import * as db from '~/db/actions/remove'
import { tracksParser } from '~/helpers/tracks-file-parser/tracks-file-parser'
import { pluralize } from '~/utils'

export const importTracks = async () => {
	const files = await getFilesFromDirectory(['aac', 'mp3', 'ogg', 'wav', 'flac', 'm4a'])

	// User canceled directory picker.
	if (!files) {
		return
	}

	if (files.length < 1) {
		toast({
			message: 'Selected directory does not contain any tracks.',
		})
		return
	}

	const id = toast({
		message: 'Preparing to import tracks to the library.',
		controls: false,
		duration: false,
	})

	try {
		const finishedData = await tracksParser(files, ({ count }) => {
			toast({
				id,
				message: `Scanning tracks. ${count.current + 1} of ${count.total}`,
				controls: 'spinner',
				duration: false,
			})
		})

		toast({
			id,
			message: `Successfully imported ${finishedData.count.success} new tracks to the library.`,
			duration: 8000,
			controls: false,
		})
	} catch (err) {
		console.error(err)
		toast({
			id,
			message: 'An unknown error has occurred while importing tracks to the library.',
			duration: false,
		})
	}
}

export const removeEverything = async () => {
	const id = toast({
		message: 'Clearing library',
		duration: false,
	})

	await db.removeEverything()

	toast({
		id,
		message: 'Library successfully cleared',
	})
}

export const removeTracks = async (ids: readonly number[]) => {
	const id = toast({
		message: `Removing selected ${pluralize(ids.length, 'track')}`,
		duration: false,
	})

	await db.removeTracks(ids)

	toast({
		id,
		message: `Successfully removed ${ids.length} ${pluralize(ids.length, 'track')}`,
	})
}
