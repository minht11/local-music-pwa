import { type DBChangeRecord, notifyAboutDatabaseChanges } from '$lib/db/channel'
import { type AppDB, getDB } from '$lib/db/get-db'
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

	const change: DBChangeRecord = {
		storeName: entityStoreName,
		key: entity.id,
		operation: 'delete',
	}

	return change
}

const removeTrackFromPlaylistsInDatabase = async (trackId: number) => {
	const db = await getDB()
	const tx = db.transaction(['playlists', 'playlistsTracks'], 'readwrite')

	const store = tx.objectStore('playlistsTracks')

	const range = IDBKeyRange.bound([0, trackId], [Number.POSITIVE_INFINITY, trackId])
	const tracks = await store.getAll(range)

	await store.delete(range)

	const changes = tracks.map(
		(t): DBChangeRecord => ({
			operation: 'delete',
			storeName: 'playlistsTracks',
			key: [t.playlistId, t.trackId],
		}),
	)

	return changes
}

export const removeTrackWithTx = async (
	tx: TrackOperationsTransaction,
	trackId: number,
): Promise<void> => {
	const tracksStore = tx.objectStore('tracks')
	const track = await tracksStore.get(trackId)

	if (!track) {
		return
	}

	const [albumChange, playlistChanges, _, ...artistsChanges] = await Promise.all([
		removeTrackRelatedData(tx, 'album', 'albums', 'name', track.album),
		removeTrackFromPlaylistsInDatabase(trackId),
		tracksStore.delete(trackId),
		...track.artists.map((artist) =>
			removeTrackRelatedData(tx, 'artists', 'artists', 'name', artist),
		),
	])

	// await tracksStore.delete(trackId)

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

export const removeTrackInDb = async (id: number): Promise<void> => {
	const db = await getDB()

	const tx = db.transaction(['tracks', 'albums', 'artists', 'playlistsTracks'], 'readwrite')
	removeTrackWithTx(tx, id)

	await tx.done
}

export const removeTrack = async (id: number): Promise<void> => {
	try {
		await removeTrackInDb(id)
	} catch (error) {
		console.error(error)
	}
}
