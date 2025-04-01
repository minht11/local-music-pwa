import { snackbar } from '$lib/components/snackbar/snackbar'
import { dispatchDatabaseChangedEvent } from '$lib/db/channel'
import { getDatabase } from '$lib/db/database'
import type { OmitId, Playlist } from '$lib/db/database-types'
import { truncate } from '$lib/helpers/utils/truncate.ts'

export const dbCreatePlaylist = async (name: string): Promise<number> => {
	const db = await getDatabase()

	const newPlaylist: OmitId<Playlist> = {
		name,
		created: Date.now(),
	}

	const id = await db.add('playlists', newPlaylist as Playlist)

	dispatchDatabaseChangedEvent({
		operation: 'add',
		storeName: 'playlists',
		key: id,
		value: {
			...newPlaylist,
			id,
		},
	})

	return id
}

export const createPlaylist = async (name: string): Promise<void> => {
	try {
		await dbCreatePlaylist(name)

		snackbar(m.libraryPlaylistCreated({
			playlistName: truncate(name, 20),
		}))
	} catch (error) {
		snackbar.unexpectedError(error)
	}
}

const dbUpdatePlaylistName = async (id: number, name: string): Promise<void> => {
	const db = await getDatabase()

	const tx = db.transaction('playlists', 'readwrite')
	const existingPlaylist = await tx.store.get(id)

	invariant(existingPlaylist, 'Playlist not found')

	const updatedPlaylist: Playlist = {
		...existingPlaylist,
		name,
	}

	await tx.store.put(updatedPlaylist)

	dispatchDatabaseChangedEvent({
		operation: 'update',
		storeName: 'playlists',
		key: id,
		value: updatedPlaylist,
	})
}

export const updatePlaylistName = async (id: number, name: string): Promise<boolean> => {
	try {
		await dbUpdatePlaylistName(id, name)

		snackbar({
			id: `playlist-updated-${id}`,
			message: m.libraryPlaylistUpdated(truncate(name, 20)),
		})

		return true
	} catch (error) {
		snackbar.unexpectedError(error)

		return false
	}
}

const dbRemovePlaylist = async (id: number): Promise<void> => {
	const db = await getDatabase()
	const tx = db.transaction(['playlists', 'playlistsTracks'], 'readwrite')
	const tracksStore = tx.objectStore('playlistsTracks')

	await Promise.all([
		tracksStore.delete(IDBKeyRange.bound([id, 0], [id, Number.POSITIVE_INFINITY])),
		tx.objectStore('playlists').delete(id),
		tx.done,
	])

	// We are not notifying about individual tracks removals
	// because we are removing the whole playlist
	dispatchDatabaseChangedEvent({
		operation: 'delete',
		storeName: 'playlists',
		key: id,
	})
}

export const removePlaylist = async (id: number, name: string): Promise<void> => {
	try {
		await dbRemovePlaylist(id)

		snackbar({
			id: `playlist-removed-${id}`,
			// TODO. i18n
			message: `Playlist "${truncate(name, 20)}" removed`,
			duration: 3000,
		})
	} catch (error) {
		snackbar.unexpectedError(error)
	}
}

export const addTrackToPlaylistInDatabase = async (
	playlistId: number,
	trackId: number,
): Promise<void> => {
	const db = await getDatabase()

	const key = await db.add('playlistsTracks', {
		playlistId,
		trackId,
	})

	dispatchDatabaseChangedEvent({
		operation: 'add',
		storeName: 'playlistsTracks',
		value: {
			playlistId,
			trackId,
		},
		key,
	})
}

export const removeTrackFromPlaylistInDatabase = async (
	playlistId: number,
	trackId: number,
): Promise<void> => {
	const db = await getDatabase()

	const key: [number, number] = [playlistId, trackId]
	await db.delete('playlistsTracks', key)

	dispatchDatabaseChangedEvent({
		operation: 'delete',
		storeName: 'playlistsTracks',
		key,
	})
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

export const dbToggleFavoriteTrack = async (
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
		await dbToggleFavoriteTrack(shouldBeRemoved, trackId)

		snackbar({
			id: 'track-favorite-toggled',
			// TODO. i18n
			message: shouldBeRemoved ? 'Track removed from favorites' : 'Track added to favorites',
			duration: 2000,
		})
	} catch (error) {
		snackbar.unexpectedError(error)
	}
}
