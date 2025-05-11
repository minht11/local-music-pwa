import { snackbar } from '$lib/components/snackbar/snackbar.ts'
import { type AppDB, getDatabase } from '$lib/db/database.ts'
import { type DatabaseChangeDetails, dispatchDatabaseChangedEvent } from '$lib/db/events.ts'
import type { IDBPTransaction, IndexNames } from 'idb'
import type { LibraryStoreName } from './types.ts'

type TrackOperationsTransaction = IDBPTransaction<
	AppDB,
	('directories' | 'tracks' | 'albums' | 'artists' | 'playlistsTracks')[],
	'readwrite'
>

const dbRemoveTrackRelatedData = async <
	Store extends Exclude<LibraryStoreName, 'playlists'>,
	ItemIndexName extends IndexNames<AppDB, Store>,
	IndexName extends IndexNames<AppDB, 'tracks'>,
	ItemValue extends AppDB[Store]['indexes'][ItemIndexName],
>(
	tx: TrackOperationsTransaction,
	trackIndex: IndexName,
	relatedItemStoreName: Store,
	relatedItemName?: ItemValue,
) => {
	if (!relatedItemName) {
		return
	}

	const relatedItemNameKey = IDBKeyRange.only(relatedItemName)

	const tracksWithItemCount = await tx
		.objectStore('tracks')
		.index(trackIndex)
		.count(relatedItemNameKey)

	// We don't delete related item if it is still used by other tracks
	if (tracksWithItemCount > 0) {
		return
	}

	const relatedItemStore = tx.objectStore(relatedItemStoreName)
	const relatedItem = await relatedItemStore.index('name').get(relatedItemNameKey)
	if (!relatedItem) {
		return
	}

	relatedItemStore.delete(relatedItem.id)

	const change: DatabaseChangeDetails = {
		storeName: relatedItemStoreName,
		key: relatedItem.id,
		operation: 'delete',
	}

	return change
}

const dbRemoveTrackFromAllPlaylists = async (trackId: number) => {
	const db = await getDatabase()
	const tx = db.transaction(['playlists', 'playlistsTracks'], 'readwrite')

	const store = tx.objectStore('playlistsTracks')

	const range = IDBKeyRange.bound([0, trackId], [Number.POSITIVE_INFINITY, trackId])
	const tracks = await store.getAll(range)

	await store.delete(range)

	const changes = tracks.map(
		(t): DatabaseChangeDetails => ({
			operation: 'delete',
			storeName: 'playlistsTracks',
			key: [t.playlistId, t.trackId],
		}),
	)

	return changes
}


export const dbRemoveTrack = async (trackId: number): Promise<void> => {
	const db = await getDatabase()
	const tx = db.transaction(['tracks', 'albums', 'artists', 'playlistsTracks'], 'readwrite')

	const track = await tx.objectStore('tracks').get(trackId)
	if (!track) {
		return
	}

	await tx.objectStore('tracks').delete(trackId)

	const [albumChange, playlistChanges, ...artistsChanges] = await Promise.all([
		dbRemoveTrackRelatedData(tx, 'album', 'albums', track.album),
		dbRemoveTrackFromAllPlaylists(trackId),
		...track.artists.map((artist) =>
			dbRemoveTrackRelatedData(tx, 'artists', 'artists', artist),
		),
		tx.done.then(() => undefined),
	])

	dispatchDatabaseChangedEvent([
		{
			storeName: 'tracks',
			operation: 'delete',
			key: trackId,
		},
		albumChange,
		...artistsChanges,
		...playlistChanges,
	])
}

export const removeTrack = async (id: number): Promise<void> => {
	try {
		await dbRemoveTrack(id)

		snackbar(m.libraryTrackRemovedFromLibrary())
	} catch (error) {
		snackbar.unexpectedError(error)
	}
}

export const dbRemoveMultipleTracks = async (trackIds: number[]): Promise<void> => {
	for (const trackId of trackIds) {
		await dbRemoveTrack(trackId)
	}
}

export const dbRemoveTrackRelatedItem = async <Store extends Extract<LibraryStoreName, 'albums' | 'artists'>>(_storeName: Store) => {
	// TODO. Implement this function
	const _db = await getDatabase()
}