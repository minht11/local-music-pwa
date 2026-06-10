import type { IDBPTransaction } from 'idb'
import { type AppDB, getDatabase } from '$lib/db/database.ts'
import { type DatabaseChangeDetails, dispatchDatabaseChangedEvent } from '$lib/db/events.ts'
import { dbDeleteOrphanedImagesWithTx } from '$lib/library/image-gc.ts'
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
				imageId: existingAlbum.imageId ?? track.imageId,
				// Drop any legacy inline blob once the album points at the images store.
				image: (existingAlbum.imageId ?? track.imageId) ? undefined : existingAlbum.image,
			}
		: {
				uuid: crypto.randomUUID(),
				name: albumName,
				artists: track.artists,
				year: track.year,
				imageId: track.imageId,
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

	// Content-addressed: identical id implies identical bytes, so skip rewriting
	// the (potentially megabyte) blobs if the record already exists.
	if (await store.getKey(imageRecord.id)) {
		return undefined
	}

	await store.put(imageRecord)

	return {
		storeName: 'images',
		key: imageRecord.id,
		operation: 'add',
	}
}

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
	const oldImageId =
		existingTrackId === undefined
			? undefined
			: (await tracksStore.get(existingTrackId))?.imageId

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
		oldImageId && oldImageId !== metadata.imageId
			? await dbDeleteOrphanedImagesWithTx(
					{
						tracksByImage: tx.objectStore('tracks').index('imageId'),
						albumsByImage: tx.objectStore('albums').index('imageId'),
						imagesStore: tx.objectStore('images'),
					},
					[oldImageId],
				)
			: []

	await tx.done

	dispatchDatabaseChangedEvent([
		{
			storeName: 'tracks',
			key: trackId,
			operation: existingTrackId === trackId ? 'update' : 'add',
		},
		albumChange,
		...artistsChanges,
		imageChange,
		...imageGcChanges,
	])

	return trackId
}
