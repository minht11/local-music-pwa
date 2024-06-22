import { snackbar } from '$lib/components/snackbar/snackbar'
import { notifyAboutDatabaseChanges } from '$lib/db/channel'
import { MusicItemType, type OmitId, type Playlist } from '$lib/db/entities'
import { getDB } from '$lib/db/get-db'
import { truncate } from '$lib/helpers/utils'

export const createPlaylistInDatabase = async (name: string) => {
	const db = await getDB()

	const newPlaylist: OmitId<Playlist> = {
		type: MusicItemType.Playlist,
		name,
		created: Date.now(),
	}

	const id = await db.add('playlists', newPlaylist as Playlist)

	notifyAboutDatabaseChanges([
		{
			operation: 'add',
			storeName: 'playlists',
			id,
			value: {
				...newPlaylist,
				id,
			},
		},
	])

	return id
}

export const createPlaylist = async (name: string) => {
	try {
		const id = await createPlaylistInDatabase(name)

		snackbar({
			id: `playlist-created-${id}`,
			// TODO. i18n
			message: `Playlist "${truncate(name, 20)}" created`,
		})
	} catch {
		snackbar({
			id: 'playlist-create-error',
			// TODO. i18n
			message: 'Failed to create playlist',
		})
	}
}