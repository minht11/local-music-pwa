import { snackbar } from '$lib/components/snackbar/snackbar'
import { type DatabaseChangeRecord, notifyAboutDatabaseChanges } from '$lib/db/channel'
import { type AppDB, getDatabase } from '$lib/db/database'
import type { IDBPTransaction, IndexNames } from 'idb'

type LibraryStoreName = 'tracks' | 'albums' | 'artists'

type TrackOperationsTransaction = IDBPTransaction<
	AppDB,
	('directories' | 'tracks' | 'albums' | 'artists' | 'playlistsTracks')[],
	'readwrite'
>

const removeTrackRelatedData = async <
	StoreName extends LibraryStoreName,
	EntityIndexName extends IndexNames<AppDB, StoreName>,
	EntityValue extends AppDB[StoreName]['indexes'][EntityIndexName],
	IndexName extends IndexNames<AppDB, 'tracks'>,
>(
	tx: TrackOperationsTransaction,
	trackIndex: IndexName,
	entityStoreName: StoreName,
	entityIndex: EntityIndexName,
	entityValue?: EntityValue,
) => {
	if (!entityValue) {
		return
	}

	const tracksWithEntityCount = await tx.objectStore('tracks').index(trackIndex).count()
	if (tracksWithEntityCount > 1) {
		return
	}

	const store = tx.objectStore(entityStoreName)
	const entity = await store.index(entityIndex).get(IDBKeyRange.only(entityValue))

	if (!entity) {
		return
	}

	const change: DatabaseChangeRecord = {
		storeName: entityStoreName,
		key: entity.id,
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
		(t): DatabaseChangeRecord => ({
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

	notifyAboutDatabaseChanges([
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
