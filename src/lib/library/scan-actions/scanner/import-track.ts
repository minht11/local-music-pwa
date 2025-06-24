import { type AppDB, getDatabase } from '$lib/db/database'
import { type DatabaseChangeDetails, dispatchDatabaseChangedEvent } from '$lib/db/events.ts'
import type { Album, Artist, Track, UnknownTrack } from '$lib/library/types.ts'
import type { IDBPTransaction } from 'idb'

type ImportTrackTx = IDBPTransaction<
	AppDB,
	('tracks' | 'albums' | 'artists' | 'playlistEntries')[],
	'readwrite'
>

const dbImportAlbum = async (tx: ImportTrackTx, track: Track) => {
	if (!track.album) {
		return
	}

	const store = tx.objectStore('albums')

	const existingAlbum = await store.index('name').get(track.album)
	const updatedAlbum: Omit<Album, 'id'> = existingAlbum
		? {
				...existingAlbum,
				artists: [...new Set([...existingAlbum.artists, ...track.artists])],
				year: existingAlbum.year ?? track.year,
				image: existingAlbum.image ?? track.image?.full,
			}
		: {
				uuid: crypto.randomUUID(),
				name: track.album,
				artists: track.artists,
				year: track.year,
				image: track.image?.full,
			}

	// Id will be auto-generated
	const albumId = await store.put(updatedAlbum as Album)

	const change: DatabaseChangeDetails = {
		storeName: 'albums',
		key: albumId,
		operation: existingAlbum ? 'update' : 'add',
	}

	return change
}

const dbImportArtist = async (tx: ImportTrackTx, artistName: string) => {
	const store = tx.objectStore('artists')

	const existingArtistId = await store.index('name').getKey(artistName)
	if (existingArtistId) {
		return
	}

	const newArtist: Omit<Artist, 'id'> = {
		name: artistName,
		uuid: crypto.randomUUID(),
	}

	const artistId = await store.put(newArtist as Artist)

	const change: DatabaseChangeDetails = {
		storeName: 'artists',
		key: artistId,
		operation: 'add',
	}

	return change
}

const dbImportArtists = (tx: ImportTrackTx, artistNames: string[]) =>
	Promise.all(artistNames.map(async (artist) => dbImportArtist(tx, artist)))

export const dbImportTrack = async (
	metadata: UnknownTrack,
	existingTrackId: number | undefined,
): Promise<number> => {
	const db = await getDatabase()
	const tx = db.transaction(['tracks', 'albums', 'artists', 'playlistEntries'], 'readwrite')

	const trackId = await tx.objectStore('tracks').put(metadata as Track, existingTrackId)
	const track: Track = {
		...metadata,
		id: trackId,
	}

	const [albumChange, artistsChanges] = await Promise.all([
		dbImportAlbum(tx, track),
		dbImportArtists(tx, track.artists),
		tx.done,
	])

	dispatchDatabaseChangedEvent([
		{
			storeName: 'tracks',
			key: trackId,
			operation: existingTrackId === trackId ? 'update' : 'add',
		},
		albumChange,
		...artistsChanges,
	])

	return trackId
}
