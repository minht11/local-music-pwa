import type { IDBPTransaction } from 'idb'
import { type AppDB, getDatabase } from '$lib/db/database.ts'
import { type DatabaseChangeDetails, dispatchDatabaseChangedEvent } from '$lib/db/events.ts'
import { dbDeleteOrphanedImagesWithTx } from '$lib/library/images.ts'
import {
	type Album,
	type Artist,
	type ImageRecord,
	type Track,
	UNKNOWN_ITEM,
	type UnknownTrack,
} from '$lib/library/types.ts'

type ImportTrackTx = IDBPTransaction<
	AppDB,
	('tracks' | 'albums' | 'artists' | 'playlistEntries' | 'images')[],
	'readwrite'
>

const dbImportAlbum = async (tx: ImportTrackTx, track: Track) => {
	const albumName = track.album

	const store = tx.objectStore('albums')

	const existingAlbum = await store.index('name').get(albumName)
	const updatedAlbum: Omit<Album, 'id'> = existingAlbum
		? {
				...existingAlbum,
				artists: [...new Set([...existingAlbum.artists, ...track.artists])].filter(
					(artist) => artist !== UNKNOWN_ITEM,
				),
				year: existingAlbum.year ?? track.year,
				imageHash: existingAlbum.imageHash ?? track.imageHash,
				// Drop any legacy inline blob once the album points at the images store.
				image:
					(existingAlbum.imageHash ?? track.imageHash) ? undefined : existingAlbum.image,
			}
		: {
				uuid: crypto.randomUUID(),
				name: albumName,
				artists: track.artists,
				year: track.year,
				imageHash: track.imageHash,
			}

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

const dbPutImageIfAbsentWithTx = async (
	tx: ImportTrackTx,
	imageRecord: ImageRecord,
): Promise<DatabaseChangeDetails | undefined> => {
	const store = tx.objectStore('images')

	// If the image already exists, we can skip writing it again.
	if (await store.getKey(imageRecord.hash)) {
		return undefined
	}

	await store.put(imageRecord)

	return {
		storeName: 'images',
		key: imageRecord.hash,
		operation: 'add',
	}
}

/** @public */
export const dbImportTrack = async (
	metadata: UnknownTrack,
	existingTrackId: number | undefined,
	imageRecord?: ImageRecord,
): Promise<number> => {
	const db = await getDatabase()
	const tx = db.transaction(
		['tracks', 'albums', 'artists', 'playlistEntries', 'images'],
		'readwrite',
	)

	const tracksStore = tx.objectStore('tracks')

	// Capture the previous artwork reference before overwriting, so we can GC it
	// if this rescan changed the embedded cover.
	const oldImageHash =
		existingTrackId === undefined
			? undefined
			: (await tracksStore.get(existingTrackId))?.imageHash

	const record =
		existingTrackId === undefined
			? metadata
			: ({ ...metadata, id: existingTrackId } satisfies Track)

	const imageChange = imageRecord ? await dbPutImageIfAbsentWithTx(tx, imageRecord) : undefined

	const trackId = await tracksStore.put(record as Track)
	const track: Track = {
		...metadata,
		id: trackId,
	}

	const [albumChange, artistsChanges] = await Promise.all([
		dbImportAlbum(tx, track),
		dbImportArtists(tx, track.artists),
	])

	// Index counts now reflect the new track + album references, so an old image
	// that nothing else points at is safely orphaned.
	const imageGcChanges =
		oldImageHash && oldImageHash !== metadata.imageHash
			? await dbDeleteOrphanedImagesWithTx(
					{
						tracksByImage: tx.objectStore('tracks').index('imageHash'),
						albumsByImage: tx.objectStore('albums').index('imageHash'),
						imagesStore: tx.objectStore('images'),
					},
					[oldImageHash],
				)
			: []

	await tx.done

	dispatchDatabaseChangedEvent([
		{
			storeName: 'tracks',
			key: trackId,
			operation: existingTrackId === undefined ? 'add' : 'update',
		},
		albumChange,
		...artistsChanges,
		imageChange,
		...imageGcChanges,
	])

	return trackId
}
