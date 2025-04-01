import { type AppDB, getDatabase } from '$lib/db/database'
import type { Album, Artist, Track, UnknownTrack } from '$lib/db/database-types'
import { type DatabaseChangeDetails, dispatchDatabaseChangedEvent } from '$lib/db/listener.ts'
import type { IDBPTransaction } from 'idb'

type ImportTrackTx = IDBPTransaction<
	AppDB,
	('tracks' | 'albums' | 'artists' | 'playlistsTracks')[],
	'readwrite'
>

const importAlbum = async (tx: ImportTrackTx, track: Track) => {
	if (!track.album) {
		return
	}

	const store = tx.objectStore('albums')

	const existingAlbum = await store.index('name').get(track.album)
	const updatedAlbum: Omit<Album, 'id'> = existingAlbum
		? {
				...existingAlbum,
				year: existingAlbum.year ?? track.year,
				image: existingAlbum.image ?? track.image?.full,
			}
		: {
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
		value: { ...updatedAlbum, id: albumId },
		operation: existingAlbum ? 'update' : 'add',
	}

	return change
}

const importArtist = async (tx: ImportTrackTx, track: Track) => {
	const store = tx.objectStore('artists')
	const changes: DatabaseChangeDetails[] = []

	for (const artist of track.artists) {
		const existingArtist = await store.index('name').get(artist)
		if (existingArtist) {
			continue
		}

		const newArtist: Omit<Artist, 'id'> = {
			name: artist,
		}

		const artistId = await store.put(newArtist as Artist)

		const change: DatabaseChangeDetails = {
			storeName: 'artists',
			key: artistId,
			value: { ...newArtist, id: artistId },
			operation: 'add',
		}

		changes.push(change)
	}

	return changes
}

export const importTrackToDb = async (
	metadata: UnknownTrack,
	existingTrackId: number | undefined,
): Promise<number> => {
	const db = await getDatabase()
	const tx = db.transaction(['tracks', 'albums', 'artists', 'playlistsTracks'], 'readwrite')

	const trackId = await tx.objectStore('tracks').put(metadata as Track, existingTrackId)

	const track: Track = {
		...metadata,
		id: trackId,
	}

	const [albumChange, artistsChanges] = await Promise.all([
		importAlbum(tx, track),
		importArtist(tx, track),
		tx.done,
	])

	dispatchDatabaseChangedEvent([
		{
			storeName: 'tracks',
			key: trackId,
			value: track,
			operation: existingTrackId === trackId ? 'update' : 'add',
		},
		albumChange,
		...artistsChanges,
	])

	return trackId
}
