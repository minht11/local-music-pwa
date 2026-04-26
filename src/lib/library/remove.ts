import type { IDBPTransaction } from 'idb'
import { type AppDB, getDatabase } from '$lib/db/database.ts'
import { type DatabaseChangeDetails, dispatchDatabaseChangedEvent } from '$lib/db/events.ts'
import type { Track } from './types.ts'

type TrackOperationsTransaction = IDBPTransaction<
	AppDB,
	('tracks' | 'albums' | 'artists' | 'playlistEntries' | 'playHistory')[],
	'readwrite'
>

const dedupe = <T>(values: readonly T[]): readonly T[] => {
	if (values.length < 2) {
		return values
	}

	return [...new Set(values)]
}

const dbRemoveTracksFromPlayHistoryWithTx = async (
	tx: TrackOperationsTransaction,
	trackIds: readonly number[],
): Promise<DatabaseChangeDetails | undefined> => {
	const store = tx.objectStore('playHistory')
	const trackIdIndex = store.index('trackId')

	let removedAny = false
	for (const trackId of trackIds) {
		const historyId = await trackIdIndex.getKey(trackId)
		if (historyId === undefined) {
			continue
		}

		await store.delete(historyId)
		removedAny = true
	}

	if (!removedAny) {
		return
	}

	return { storeName: 'playHistory' }
}

const dbRemoveTracksFromAllPlaylistsWithTx = async (
	tx: TrackOperationsTransaction,
	trackIds: readonly number[],
) => {
	const store = tx.objectStore('playlistEntries')
	const trackIdIndex = store.index('trackId')

	const changes: DatabaseChangeDetails[] = []
	for (const trackId of trackIds) {
		const entries = await trackIdIndex.getAll(trackId)
		await Promise.all(entries.map((entry) => store.delete(entry.id)))

		changes.push(
			...entries.map(
				(entry): DatabaseChangeDetails => ({
					operation: 'delete',
					storeName: 'playlistEntries',
					key: entry.id,
					value: entry,
				}),
			),
		)
	}

	return changes
}

const dbRemoveUnusedAlbumsWithTx = async (
	tx: TrackOperationsTransaction,
	albumNames: readonly Track['album'][],
) => {
	const tracksByAlbum = tx.objectStore('tracks').index('album')
	const albumsStore = tx.objectStore('albums')

	const changes: DatabaseChangeDetails[] = []
	for (const albumName of dedupe(albumNames)) {
		const albumNameKey = IDBKeyRange.only(albumName)
		const tracksWithAlbumCount = await tracksByAlbum.count(albumNameKey)
		if (tracksWithAlbumCount > 0) {
			continue
		}

		const album = await albumsStore.index('name').get(albumNameKey)
		if (!album) {
			continue
		}

		await albumsStore.delete(album.id)
		changes.push({
			storeName: 'albums',
			key: album.id,
			operation: 'delete',
		})
	}

	return changes
}

const dbRemoveUnusedArtistsWithTx = async (
	tx: TrackOperationsTransaction,
	artistNames: readonly string[],
) => {
	const tracksByArtist = tx.objectStore('tracks').index('artists')
	const artistsStore = tx.objectStore('artists')

	const changes: DatabaseChangeDetails[] = []
	for (const artistName of dedupe(artistNames)) {
		const artistNameKey = IDBKeyRange.only(artistName)
		const tracksWithArtistCount = await tracksByArtist.count(artistNameKey)
		if (tracksWithArtistCount > 0) {
			continue
		}

		const artist = await artistsStore.index('name').get(artistNameKey)
		if (!artist) {
			continue
		}

		await artistsStore.delete(artist.id)
		changes.push({
			storeName: 'artists',
			key: artist.id,
			operation: 'delete',
		})
	}

	return changes
}

export const dbRemoveTracks = async (trackIds: readonly number[]): Promise<void> => {
	if (trackIds.length === 0) {
		return
	}

	const db = await getDatabase()
	const tx = db.transaction(
		['tracks', 'albums', 'artists', 'playlistEntries', 'playHistory'],
		'readwrite',
	)

	const tracksStore = tx.objectStore('tracks')
	const existingTracks = (
		await Promise.all(dedupe(trackIds).map((trackId) => tracksStore.get(trackId)))
	).filter((track) => track !== undefined)

	if (existingTracks.length === 0) {
		await tx.done
		return
	}

	const existingTrackIds = await Promise.all(
		existingTracks.map((track) => tracksStore.delete(track.id).then(() => track.id)),
	)

	const [albumChanges, playlistChanges, historyChange, artistChanges] = await Promise.all([
		dbRemoveUnusedAlbumsWithTx(
			tx,
			existingTracks.map((track) => track.album),
		),
		dbRemoveTracksFromAllPlaylistsWithTx(tx, existingTrackIds),
		dbRemoveTracksFromPlayHistoryWithTx(tx, existingTrackIds),
		dbRemoveUnusedArtistsWithTx(
			tx,
			existingTracks.flatMap((track) => track.artists),
		),
	])

	const changes = [
		...existingTrackIds.map(
			(trackId): DatabaseChangeDetails => ({
				storeName: 'tracks',
				operation: 'delete',
				key: trackId,
			}),
		),
		historyChange,
		...albumChanges,
		...artistChanges,
		...playlistChanges,
	].filter((change) => change !== undefined)

	await tx.done

	if (changes.length > 0) {
		dispatchDatabaseChangedEvent(changes)
	}
}

export const dbRemoveAlbum = async (albumId: number): Promise<void> => {
	const db = await getDatabase()
	const tx = db.transaction(['albums', 'tracks'], 'readonly')
	const album = await tx.objectStore('albums').get(albumId)
	if (!album) {
		await tx.done
		return
	}

	const tracksIds = await tx.objectStore('tracks').index('album').getAllKeys(album.name)
	await tx.done

	// If no tracks references it, it will be deleted automatically
	await dbRemoveTracks(tracksIds)
}

export const dbRemoveArtist = async (artistId: number): Promise<void> => {
	const db = await getDatabase()
	const tx = db.transaction(['artists', 'tracks'], 'readonly')
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
	await dbRemoveTracks(tracksIds)
}
