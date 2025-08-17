import type { IDBPObjectStore } from 'idb'
import { snackbar } from '$lib/components/snackbar/snackbar'
import { type AppDB, getDatabase } from '$lib/db/database.ts'
import { type DatabaseChangeDetails, dispatchDatabaseChangedEvent } from '$lib/db/events.ts'
import { createUIAction } from '$lib/helpers/ui-action.ts'
import { truncate } from '$lib/helpers/utils/truncate.ts'
import type { Playlist, PlaylistEntry } from '$lib/library/types.ts'
import { FAVORITE_PLAYLIST_ID } from './types.ts'

export { FAVORITE_PLAYLIST_ID } from './types.ts'

export const dbCreatePlaylist = async (
	name: string,
	description: string,
	createdAt = Date.now(),
): Promise<number> => {
	const db = await getDatabase()

	const newPlaylist: Omit<Playlist, 'id'> = {
		name,
		description,
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

export const createPlaylist = async (name: string, description: string): Promise<void> => {
	try {
		await dbCreatePlaylist(name, description)

		snackbar(
			m.libraryPlaylistCreated({
				playlistName: truncate(name, 20),
			}),
		)
	} catch (error) {
		snackbar.unexpectedError(error)
	}
}

export interface UpdatePlaylistOptions {
	id: number
	name: string
	description: string
}

const dbUpdatePlaylist = async (options: UpdatePlaylistOptions): Promise<void> => {
	const db = await getDatabase()

	const id = options.id

	const tx = db.transaction('playlists', 'readwrite')
	const existingPlaylist = await tx.store.get(id)

	invariant(existingPlaylist, 'Playlist not found')

	const updatedPlaylist: Playlist = {
		...existingPlaylist,
		name: options.name,
		description: options.description,
	}

	await tx.store.put(updatedPlaylist)

	dispatchDatabaseChangedEvent({
		operation: 'update',
		storeName: 'playlists',
		key: id,
	})
}

export const updatePlaylist = async (options: UpdatePlaylistOptions): Promise<boolean> => {
	try {
		await dbUpdatePlaylist(options)

		snackbar({
			id: `playlist-updated-${options.id}`,
			message: m.libraryPlaylistUpdated(truncate(options.name, 20)),
		})

		return true
	} catch (error) {
		snackbar.unexpectedError(error)

		return false
	}
}

export const dbRemovePlaylist = async (playlistId: number): Promise<void> => {
	const db = await getDatabase()
	const tx = db.transaction(['playlists', 'playlistEntries'], 'readwrite')
	const entriesStore = tx.objectStore('playlistEntries')

	const entriesIds = await entriesStore
		.index('playlistTrack')
		.getAllKeys(IDBKeyRange.bound([playlistId], [playlistId + 1], false, true))

	await Promise.all([
		entriesIds.map((id) => entriesStore.delete(id)),
		tx.objectStore('playlists').delete(playlistId),
		tx.done,
	])

	// We are not notifying about individual tracks removals
	// because we are removing the whole playlist
	dispatchDatabaseChangedEvent({
		operation: 'delete',
		storeName: 'playlists',
		key: playlistId,
	})
}

export type DbPlaylistEntriesStore = IDBPObjectStore<
	AppDB,
	['playlistEntries'],
	'playlistEntries',
	'readwrite'
>

export const getPlaylistEntriesDatabaseStore = async (): Promise<DbPlaylistEntriesStore> => {
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
	store: DbPlaylistEntriesStore,
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

interface RemoveTracksFromPlaylistOptions {
	playlistIds: number[]
	trackIds: number[]
}

export const dbRemoveTracksFromPlaylistsWithTx = async (
	store: DbPlaylistEntriesStore,
	options: RemoveTracksFromPlaylistOptions,
) => {
	const { playlistIds, trackIds } = options

	const trackIdIndex = store.index('trackId')
	const changes: DatabaseChangeDetails[] = []

	for (const trackId of trackIds) {
		for await (const cursor of trackIdIndex.iterate(trackId)) {
			if (playlistIds.includes(cursor.value.playlistId)) {
				await cursor.delete()
				changes.push({
					storeName: 'playlistEntries',
					operation: 'delete',
					key: cursor.primaryKey,
					value: cursor.value,
				})
			}
		}
	}

	return changes
}

interface BatchModifyPlaylistSelectionOptions {
	trackIds: number[]
	playlistsIdsAddTo: number[]
	playlistsIdsRemoveFrom: number[]
}

export const dbBatchModifyPlaylistsSelection = async (
	options: BatchModifyPlaylistSelectionOptions,
): Promise<boolean> => {
	const store = await getPlaylistEntriesDatabaseStore()
	const { trackIds, playlistsIdsAddTo, playlistsIdsRemoveFrom } = options

	const allChanges: DatabaseChangeDetails[] = []
	if (playlistsIdsRemoveFrom.length > 0) {
		const changes = await dbRemoveTracksFromPlaylistsWithTx(store, {
			playlistIds: playlistsIdsRemoveFrom,
			trackIds,
		})
		allChanges.push(...changes)
	}

	if (playlistsIdsAddTo.length > 0) {
		const changes = await dbAddTracksToPlaylistsWithTx(store, {
			playlistIds: playlistsIdsAddTo,
			trackIds,
		})
		allChanges.push(...changes)
	}

	dispatchDatabaseChangedEvent(allChanges)

	return allChanges.length > 0
}

const dbRemoveTrackEntryFromPlaylist = async (playlistEntryId: number): Promise<void> => {
	const db = await getDatabase()

	const entry = await db.get('playlistEntries', playlistEntryId)
	invariant(entry)

	await db.delete('playlistEntries', entry.id)

	dispatchDatabaseChangedEvent({
		operation: 'delete',
		storeName: 'playlistEntries',
		key: entry.id,
		value: entry,
	})
}

export const removeTrackEntryFromPlaylist = createUIAction(
	m.libraryTrackRemovedFromPlaylist(),
	(playlistEntryId: number) => dbRemoveTrackEntryFromPlaylist(playlistEntryId),
)

const dbAddTrackToFavorites = async (trackId: number): Promise<void> => {
	const db = await getDatabase()

	const playlistEntry: Omit<PlaylistEntry, 'id'> = {
		playlistId: FAVORITE_PLAYLIST_ID,
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

const dbRemoveTrackFromFavorites = async (trackId: number): Promise<void> => {
	const db = await getDatabase()

	const entry = await db.getFromIndex('playlistEntries', 'playlistTrack', [
		FAVORITE_PLAYLIST_ID,
		trackId,
	])
	invariant(entry)

	await db.delete('playlistEntries', entry.id)

	dispatchDatabaseChangedEvent({
		operation: 'delete',
		storeName: 'playlistEntries',
		key: entry.id,
		value: entry,
	})
}

export const toggleFavoriteTrack = async (
	shouldBeRemoved: boolean,
	trackId: number,
): Promise<boolean> => {
	try {
		if (shouldBeRemoved) {
			await dbRemoveTrackFromFavorites(trackId)
		} else {
			await dbAddTrackToFavorites(trackId)
		}

		return true
	} catch (error) {
		snackbar.unexpectedError(error)

		return false
	}
}
