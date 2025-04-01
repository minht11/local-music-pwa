import { snackbar } from '$lib/components/snackbar/snackbar.ts'
import { type AppDB, getDatabase } from '$lib/db/database.ts'
import { type DatabaseChangeDetails, dispatchDatabaseChangedEvent } from '$lib/db/listener.ts'
import type { IDBPTransaction, IndexNames } from 'idb'
import type { LibraryItemStoreName } from './types.ts'

type TrackOperationsTransaction = IDBPTransaction<
	AppDB,
	('directories' | 'tracks' | 'albums' | 'artists' | 'playlistsTracks')[],
	'readwrite'
>

const removeTrackRelatedData = async <
	Store extends Exclude<LibraryItemStoreName, 'playlists'>,
	ItemIndexName extends IndexNames<AppDB, Store>,
	ItemValue extends AppDB[Store]['indexes'][ItemIndexName],
	IndexName extends IndexNames<AppDB, 'tracks'>,
>(
	tx: TrackOperationsTransaction,
	trackIndex: IndexName,
	itemStoreName: Store,
	itemIndex: ItemIndexName,
	itemValue?: ItemValue,
) => {
	if (!itemValue) {
		return
	}

	const tracksWithItemCount = await tx.objectStore('tracks').index(trackIndex).count()
	if (tracksWithItemCount > 1) {
		return
	}

	const store = tx.objectStore(itemStoreName)
	const item = await store.index(itemIndex).get(IDBKeyRange.only(itemValue))
	if (!item) {
		return
	}

	const change: DatabaseChangeDetails = {
		storeName: itemStoreName,
		key: item.id,
		operation: 'delete',
	}

	return change
}

const removeTrackFromPlaylistsInDatabase = async (trackId: number) => {
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

	const [albumChange, playlistChanges, _, ...artistsChanges] = await Promise.all([
		removeTrackRelatedData(tx, 'album', 'albums', 'name', track.album),
		removeTrackFromPlaylistsInDatabase(trackId),
		tx.done,
		...track.artists.map((artist) =>
			removeTrackRelatedData(tx, 'artists', 'artists', 'name', artist),
		),
	])

	await db.delete('tracks', trackId)

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

export const removeTrack = async (id: number): Promise<void> =>
	dbRemoveTrack(id).then(
		() => {
			snackbar({
				id: 'track-removed',
				message: 'Track removed',
			})
		},
		() => {
			snackbar({
				id: 'track-removed-error',
				message: 'Failed to remove track',
			})
		},
	)
