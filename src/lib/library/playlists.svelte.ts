import { snackbar } from '$lib/components/snackbar/snackbar'
import { notifyAboutDatabaseChanges } from '$lib/db/channel'
import type { OmitId, Playlist } from '$lib/db/database-types'
import { getDB } from '$lib/db/get-db'
import { truncate } from '$lib/helpers/utils/truncate.ts'
import invariant from 'tiny-invariant'

export const createPlaylistInDatabase = async (name: string): Promise<number> => {
	const db = await getDB()

	const newPlaylist: OmitId<Playlist> = {
		name,
		created: Date.now(),
	}

	const id = await db.add('playlists', newPlaylist as Playlist)

	notifyAboutDatabaseChanges([
		{
			operation: 'add',
			storeName: 'playlists',
			key: id,
			value: {
				...newPlaylist,
				id,
			},
		},
	])

	return id
}

export const createPlaylist = async (name: string): Promise<void> => {
	try {
		const id = await createPlaylistInDatabase(name)

		snackbar({
			id: `playlist-created-${id}`,
			// TODO. i18n
			message: `Playlist "${truncate(name, 20)}" created`,
		})
	} catch {
		// TODO. Add message if playlist already exists
		snackbar({
			id: 'playlist-create-error',
			// TODO. i18n
			message: 'Failed to create playlist',
		})
	}
}

export const updatePlaylistNameInDatabase = async (id: number, name: string): Promise<void> => {
	const db = await getDB()

	const tx = db.transaction('playlists', 'readwrite')
	const existingPlaylist = await tx.store.get(id)

	invariant(existingPlaylist, 'Playlist not found')

	const updatedPlaylist: Playlist = {
		...existingPlaylist,
		name,
	}

	await tx.store.put(updatedPlaylist)

	notifyAboutDatabaseChanges([
		{
			operation: 'update',
			storeName: 'playlists',
			key: id,
			value: updatedPlaylist,
		},
	])
}

export const removePlaylistInDatabase = async (id: number): Promise<void> => {
	const db = await getDB()
	const tx = db.transaction(['playlists', 'playlistsTracks'], 'readwrite')
	const tracksStore = tx.objectStore('playlistsTracks')

	await Promise.all([
		tracksStore.delete(IDBKeyRange.bound([id, 0], [id, Number.POSITIVE_INFINITY])),
		tx.objectStore('playlists').delete(id),
		tx.done,
	])

	// We are not notifying about individual tracks removals
	// because we are removing the whole playlist
	notifyAboutDatabaseChanges([
		{
			operation: 'delete',
			storeName: 'playlists',
			key: id,
		},
	])
}

export const removePlaylist = async (id: number, name: string): Promise<void> => {
	try {
		await removePlaylistInDatabase(id)

		snackbar({
			id: `playlist-removed-${id}`,
			// TODO. i18n
			message: `Playlist "${truncate(name, 20)}" removed`,
			duration: 3000,
		})
	} catch {
		snackbar({
			id: 'playlist-remove-error',
			// TODO. i18n
			message: 'Failed to remove playlist',
		})
	}
}

export const addTrackToPlaylistInDatabase = async (
	playlistId: number,
	trackId: number,
): Promise<void> => {
	const db = await getDB()

	const key = await db.add('playlistsTracks', {
		playlistId,
		trackId,
	})

	notifyAboutDatabaseChanges([
		{
			operation: 'add',
			storeName: 'playlistsTracks',
			value: {
				playlistId,
				trackId,
			},
			key,
		},
	])
}

export const removeTrackFromPlaylistInDatabase = async (
	playlistId: number,
	trackId: number,
): Promise<void> => {
	const db = await getDB()

	const key: [number, number] = [playlistId, trackId]
	await db.delete('playlistsTracks', key)

	notifyAboutDatabaseChanges([
		{
			operation: 'delete',
			storeName: 'playlistsTracks',
			key,
		},
	])
}

export const toggleTrackInPlaylistInDatabase = async (
	shouldBeRemoved: boolean,
	playlistId: number,
	trackId: number,
): Promise<void> => {
	if (shouldBeRemoved) {
		await removeTrackFromPlaylistInDatabase(playlistId, trackId)
	} else {
		await addTrackToPlaylistInDatabase(playlistId, trackId)
	}
}

/** Special type of playlist which user cannot modify */
export const FAVORITE_PLAYLIST_ID = -1

export const toggleFavoriteTrackInDatabase = async (
	shouldBeRemoved: boolean,
	trackId: number,
): Promise<void> => {
	if (shouldBeRemoved) {
		await removeTrackFromPlaylistInDatabase(FAVORITE_PLAYLIST_ID, trackId)
	} else {
		await addTrackToPlaylistInDatabase(FAVORITE_PLAYLIST_ID, trackId)
	}
}

export const toggleFavoriteTrack = async (
	shouldBeRemoved: boolean,
	trackId: number,
): Promise<void> => {
	try {
		await toggleFavoriteTrackInDatabase(shouldBeRemoved, trackId)

		snackbar({
			id: 'track-favorite-toggled',
			// TODO. i18n
			message: shouldBeRemoved ? 'Track removed from favorites' : 'Track added to favorites',
			duration: 2000,
		})
	} catch {
		snackbar({
			id: 'track-favorite-toggle-error',
			// TODO. i18n
			message: 'Failed to toggle favorite track',
		})
	}
}
