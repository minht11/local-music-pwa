import { snackbar } from '$lib/components/snackbar/snackbar'

export const removeTracks = async (ids: readonly number[]) => {
	const id = 'remove-tracks'
	snackbar({
		id,
		message: `Removing selected ${pluralize(ids.length, 'track')}`,
		duration: false,
	})

	// await db.removeTracks(ids)

	snackbar({
		id,
		message: `Successfully removed ${ids.length} ${pluralize(ids.length, 'track')}`,
	})
}
