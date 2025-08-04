import type { IDBPObjectStore } from 'idb'
import { snackbar } from '$lib/components/snackbar/snackbar'
import { type AppDB, getDatabase } from '$lib/db/database'
import { type DatabaseChangeDetails, dispatchDatabaseChangedEvent } from '$lib/db/events.ts'
import { createUIAction } from '$lib/helpers/ui-action.ts'
import { truncate } from '$lib/helpers/utils/truncate.ts'
import type { Playlist, PlaylistEntry } from '$lib/library/types.ts'
import { FAVORITE_PLAYLIST_ID } from './types.ts'

export { FAVORITE_PLAYLIST_ID } from './types.ts'

export const dbCreatePlaylist = async (name: string, createdAt = Date.now()): Promise<number> => {
	const db = await getDatabase()

	const newPlaylist: Omit<Playlist, 'id'> = {
		name,
		uuid: crypto.randomUUID(),
		createdAt,
	}

	const id = await db.add('playlists', newPlaylist as Playlist)

	dispatchDatabaseChangedEvent({
		operation: 'add',
		storeName: 'playlists',
		key: id,
	})

	return id
}

export const createPlaylist = async (name: string): Promise<void> => {
	try {
		await dbCreatePlaylist(name)

		snackbar(
			m.libraryPlaylistCreated({
				playlistName: truncate(name, 20),
			}),
		)
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

const dbRemovePlaylist = async (playlistId: number): Promise<void> => {
	const db = await getDatabase()
	const tx = db.transaction(['playlists', 'playlistEntries'], 'readwrite')
	const tracksStore = tx.objectStore('playlistEntries')

	const entriesIds = await tx.objectStore('playlistEntries').getAllKeys(playlistId)

	await Promise.all([
		tracksStore.delete(
			IDBKeyRange.bound([playlistId, 0], [playlistId, Number.POSITIVE_INFINITY]),
		),
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

export const removePlaylist = createUIAction(m.libraryPlaylistRemoved(), (id: number) =>
	dbRemovePlaylist(id),
)

const dbAddTrackToPlaylist = async (playlistId: number, trackId: number): Promise<void> => {
	const db = await getDatabase()

	const playlistEntry: Omit<PlaylistEntry, 'id'> = {
		playlistId,
		trackId,
		addedAt: Date.now(),
	}

	const key = await db.add('playlistEntries', playlistEntry as PlaylistEntry)

	dispatchDatabaseChangedEvent({
		operation: 'add',
		storeName: 'playlistEntries',
		key,
		value: {
			...playlistEntry,
			id: key,
		},
	})
}

export const getPlaylistEntriesDatabaseStore = async (): Promise<
	IDBPObjectStore<AppDB, ['playlistEntries'], 'playlistEntries', 'readwrite'>
> => {
	const db = await getDatabase()
	const tx = db.transaction('playlistEntries', 'readwrite')
	const store = tx.objectStore('playlistEntries')

	return store
}

export interface AddTracksToPlaylistOptions {
	playlistIds: number[]
	trackIds: number[]
}

export const dbAddTracksToPlaylistsWithTx = (
	store: IDBPObjectStore<AppDB, ['playlistEntries'], 'playlistEntries', 'readwrite'>,
	options: AddTracksToPlaylistOptions,
) => {
	const promises = options.trackIds.flatMap((trackId) =>
		options.playlistIds.map(async (playlistId) => {
			const playlistEntry: Omit<PlaylistEntry, 'id'> = {
				playlistId,
				trackId,
				addedAt: Date.now(),
			}

			const playlistEntryId = await store.add(playlistEntry as PlaylistEntry)

			const change: DatabaseChangeDetails = {
				storeName: 'playlistEntries',
				key: playlistEntryId,
				operation: 'add',
				value: {
					...playlistEntry,
					id: playlistEntryId,
				},
			}

			return change
		}),
	)

	return Promise.all(promises)
}

const dbRemoveTrackFromPlaylist = async (playlistEntryId: number): Promise<void> => {
	const db = await getDatabase()

	const entry = await db.get('playlistEntries', playlistEntryId)
	if (!entry) {
		throw new Error(`Playlist entry with id ${playlistEntryId} not found`)
	}

	await db.delete('playlistEntries', entry.id)

	dispatchDatabaseChangedEvent({
		operation: 'delete',
		storeName: 'playlistEntries',
		key: entry.id,
		value: entry,
	})
}

export const removeTrackFromPlaylist = createUIAction(
	m.libraryTrackRemovedFromPlaylist(),
	(playlistEntryId: number) => dbRemoveTrackFromPlaylist(playlistEntryId),
)

export const toggleFavoriteTrack = async (
	shouldBeRemoved: boolean,
	trackId: number,
): Promise<void> => {
	try {
		if (shouldBeRemoved) {
			await dbRemoveTrackFromPlaylist(FAVORITE_PLAYLIST_ID, trackId)
		} else {
			await dbAddTrackToPlaylist(FAVORITE_PLAYLIST_ID, trackId)
		}

		snackbar({
			id: 'track-favorite-toggled',
			message: shouldBeRemoved
				? m.libraryTrackRemovedFromFavorites()
				: m.libraryTrackAddedToFavorites(),
			duration: 2000,
		})
	} catch (error) {
		snackbar.unexpectedError(error)
	}
}
