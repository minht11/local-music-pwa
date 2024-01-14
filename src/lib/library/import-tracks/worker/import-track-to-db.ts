import { type DBChangeRecord, notifyAboutDatabaseChanges } from '$lib/db/channel'
import { type Album, MusicItemType, type Track, type UnknownTrack } from '$lib/db/entities'
import { type AppDB, getDB } from '$lib/db/get-db'
import type { IDBPTransaction } from 'idb'

const importAlbum = async (
	track: Track,
	tx: IDBPTransaction<AppDB, ('tracks' | 'albums')[], 'readwrite'>,
) => {
	if (!track.album) {
		return
	}

	const now = performance.now()
	const store = tx.objectStore('albums')

	const existingAlbum = await store.index('name').get(track.album)
	const updatedAlbum: Omit<Album, 'id'> = existingAlbum
		? {
				...existingAlbum,
				year: existingAlbum.year ?? track.year,
				image: existingAlbum.image ?? track.images?.full,
		  }
		: {
				type: MusicItemType.ALBUM,
				name: track.album,
				artists: track.artists,
				year: track.year,
				image: track.images?.full,
		  }

	// Id will be auto-generated
	const albumId = await store.put(updatedAlbum as Album)

	const change: DBChangeRecord = {
		storeName: 'albums',
		id: albumId,
		value: { ...updatedAlbum, id: albumId },
		operation: existingAlbum ? 'update' : 'add',
	}

	console.log('Import album took', performance.now() - now)

	return change
}

export const importTrackToDb = async (metadata: UnknownTrack) => {
	const db = await getDB()

	const tx = db.transaction(['tracks', 'albums'], 'readwrite')
	const tracksStore = tx.objectStore('tracks')

	const trackId = await tracksStore.add(metadata as Track)

	const track: Track = {
		...metadata,
		id: trackId,
	}

	const [albumChange] = await Promise.all([importAlbum(track, tx), tx.done])

	// TODO. Check if track already exists.

	notifyAboutDatabaseChanges([
		{
			storeName: 'tracks',
			id: trackId,
			value: track,
			operation: 'add',
		},
		albumChange,
	])
}
