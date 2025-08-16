import type { IDBPTransaction } from 'idb'
import { type AppDB, type AppIndexNames, getDatabase } from '$lib/db/database.ts'
import { type DatabaseChangeDetails, dispatchDatabaseChangedEvent } from '$lib/db/events.ts'
import { createUIAction } from '$lib/helpers/ui-action.ts'
import type { LibraryStoreName } from './types.ts'

type TrackOperationsTransaction = IDBPTransaction<
	AppDB,
	('directories' | 'tracks' | 'albums' | 'artists' | 'playlistEntries')[],
	'readwrite'
>

const dbRemoveTrackRelatedData = async <
	Store extends Exclude<LibraryStoreName, 'playlists'>,
	ItemIndexName extends AppIndexNames<Store>,
	IndexName extends AppIndexNames<'tracks'>,
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
	const tx = db.transaction(['playlists', 'playlistEntries'], 'readwrite')

	const store = tx.objectStore('playlistEntries')

	// Get all playlist entries for this track using the trackId index
	const entries = await store.index('trackId').getAll(trackId)

	// Delete each entry
	await Promise.all(entries.map((entry) => store.delete(entry.id)))

	await tx.done

	const changes = entries.map(
		(entry): DatabaseChangeDetails => ({
			operation: 'delete',
			storeName: 'playlistEntries',
			key: entry.id,
			value: entry,
		}),
	)

	return changes
}

export const dbRemoveTrack = async (trackId: number): Promise<void> => {
	const db = await getDatabase()
	const tx = db.transaction(['tracks', 'albums', 'artists', 'playlistEntries'], 'readwrite')

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

export const removeTrack = createUIAction(m.libraryTrackRemovedFromLibrary(), (id: number) =>
	dbRemoveTrack(id),
)

export const dbRemoveMultipleTracks = async (trackIds: number[]): Promise<void> => {
	for (const trackId of trackIds) {
		await dbRemoveTrack(trackId)
	}
}

export const dbRemoveAlbum = async (albumId: number): Promise<void> => {
	const db = await getDatabase()
	const tx = db.transaction(['albums', 'tracks'], 'readwrite')
	const album = await tx.objectStore('albums').get(albumId)
	if (!album) {
		await tx.done
		return
	}

	const tracksIds = await tx.objectStore('tracks').index('album').getAllKeys(album.name)
	await tx.done

	// If no tracks references it, it will be deleted automatically
	await dbRemoveMultipleTracks(tracksIds)
}

export const removeAlbum = createUIAction(m.libraryAlbumRemovedFromLibrary(), (id: number) =>
	dbRemoveAlbum(id),
)

export const dbRemoveArtist = async (artistId: number): Promise<void> => {
	const db = await getDatabase()
	const tx = db.transaction(['artists', 'tracks'], 'readwrite')
	const artist = await tx.objectStore('artists').get(artistId)
	if (!artist) {
		await tx.done
		return
	}

	// Artists is an array, we want to remove all tracks that reference this artist, artist can have other names as well
	const tracksIds = await tx
		.objectStore('tracks')
		.index('artists')
		.getAllKeys(IDBKeyRange.only(artist.name))

	await tx.done

	// If no tracks references it, it will be deleted automatically
	await dbRemoveMultipleTracks(tracksIds)
}

export const removeArtist = createUIAction(m.libraryArtistRemovedFromLibrary(), (id: number) =>
	dbRemoveArtist(id),
)
