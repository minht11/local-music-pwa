import { snackbar } from '$lib/components/snackbar/snackbar'
import * as m from '$paraglide/messages'

export const removeTracks = async (ids: readonly number[]) => {
	const id = 'remove-tracks'
	snackbar({
		id,
		message: m.removingSelectedTracks({
			count: ids.length,
		}),
		duration: false,
	})

	// await db.removeTracks(ids)

	snackbar({
		id,
		message: m.successfullyRemovedTracks({
			count: ids.length,
		}),
	})
}
