import 'fake-indexeddb/auto'
import { describe, expect, it, beforeEach } from 'vitest'
import { getDatabase, type AppStoreNames } from '$lib/db/database.ts'
import { dbRemoveTrack, dbRemoveAlbum, dbRemoveArtist } from '$lib/library/remove.ts'
import { dbImportTrack } from '$lib/library/scan-actions/scanner/import-track.ts'
import { dbCreatePlaylist } from '$lib/library/playlists-actions.ts'
import type { UnknownTrack } from '$lib/library/types.ts'
import { clearDatabaseStores } from '../shared.ts'

export function expectToBeDefined<T>(value: T | undefined): asserts value is T {
	expect(value).toBeDefined()
}

const dbGetAllAndExpectLength = async <S extends AppStoreNames>(
	storeName: S,
	expectedCount: number,
	message?: string
) => {
	const db = await getDatabase()
	const items = await db.getAll(storeName)
	expect(items, message).toHaveLength(expectedCount)

	return items
}

const dbImportTestTrack = async (overrides: Partial<UnknownTrack> = {}): Promise<number> => {
	const trackData: UnknownTrack = {
		uuid: crypto.randomUUID(),
		name: 'Test Track',
		album: 'Test Album',
		artists: ['Test Artist'],
		year: '2023',
		duration: 180,
		genre: ['Rock'],
		file: new File(['test'], 'test.mp3', { type: 'audio/mp3' }) as any,
		scannedAt: Date.now(),
		fileName: 'test.mp3',
		directory: 1,
		...overrides,
	}

	return await dbImportTrack(trackData, undefined)
}

// Helper function to add track to playlist (since dbAddTrackToPlaylist is not exported)
const addTrackToPlaylist = async (playlistId: number, trackId: number): Promise<void> => {
	const db = await getDatabase()
	const playlistEntry = {
		playlistId,
		trackId,
		addedAt: Date.now(),
	}
	await db.add('playlistEntries', playlistEntry as any)
}

describe('remove functions', () => {
	beforeEach(async () => {
		await clearDatabaseStores()
	})

	describe('dbRemoveTrack', () => {
		it('should remove a track and clean up unused album and artist', async () => {
			const trackId = await dbImportTestTrack()

			const db = await getDatabase()

			// Verify track, album, and artist were created
			await dbGetAllAndExpectLength('tracks', 1)

			const albums = await dbGetAllAndExpectLength('albums', 1)
			expect(albums[0]?.name).toBe('Test Album')

			const artists = await dbGetAllAndExpectLength('artists', 1)
			expect(artists[0]?.name).toBe('Test Artist')

			// Remove the track
			await dbRemoveTrack(trackId)

			// Verify track is removed
			const removedTrack = await db.get('tracks', trackId)
			expect(removedTrack).toBeUndefined()

			// Verify album and artist are also removed (cleanup)
			await dbGetAllAndExpectLength('albums', 0)
			await dbGetAllAndExpectLength('artists', 0)
		})

		it('should not remove album or artist if still referenced by other tracks', async () => {
			// Create two tracks with the same album and artist
			const track1Id = await dbImportTestTrack({ name: 'Track 1' })
			const track2Id = await dbImportTestTrack({ name: 'Track 2' })

			await dbGetAllAndExpectLength('tracks', 2)
			await dbGetAllAndExpectLength('albums', 1)
			await dbGetAllAndExpectLength('artists', 1)

			await dbRemoveTrack(track1Id)

			// Verify only one track is removed
			const tracksAfter = await dbGetAllAndExpectLength('tracks', 1)
			expect(tracksAfter[0]?.id).toBe(track2Id)

			// Verify album and artist are still there
			await dbGetAllAndExpectLength('albums', 1)
			await dbGetAllAndExpectLength('artists', 1)
		})

		it('should remove track from all playlists when removing the track', async () => {
			const trackId = await dbImportTestTrack()

			// Create a playlist and add the track to it
			await dbCreatePlaylist('Test Playlist')
			const playlists = await dbGetAllAndExpectLength('playlists', 1)
			const playlistId = playlists[0]?.id
			expectToBeDefined(playlistId)

			await addTrackToPlaylist(playlistId, trackId)

			// Verify playlist entry exists
			const playlistEntries = await dbGetAllAndExpectLength('playlistEntries', 1)
			expect(playlistEntries[0]?.trackId).toBe(trackId)

			// Remove the track
			await dbRemoveTrack(trackId)

			await dbGetAllAndExpectLength('playlistEntries', 0)

			// Verify playlist still exists
			await dbGetAllAndExpectLength('playlists', 1)
		})

		it('should handle removing non-existent track gracefully', async () => {
			// Try to remove a track that doesn't exist
			await expect(dbRemoveTrack(999)).resolves.toBeUndefined()
		})

		it('should handle track without album or artist', async () => {
			// Create a track without album or artists
			const trackId = await dbImportTestTrack({
				album: undefined,
				artists: [],
			})

			const db = await getDatabase()

			// Verify track was created
			const track = await db.get('tracks', trackId)
			expect(track).toBeTruthy()

			// Remove the track
			await dbRemoveTrack(trackId)

			// Verify track is removed
			const removedTrack = await db.get('tracks', trackId)
			expect(removedTrack).toBeUndefined()
		})
	})

	describe('dbRemoveAlbum', () => {
		it('should remove album and all its tracks', async () => {
			// Create two tracks with the same album
			await dbImportTestTrack({ name: 'Track 1' })
			await dbImportTestTrack({ name: 'Track 2' })

			const albums = await dbGetAllAndExpectLength('albums', 1)
			const albumId = albums[0]?.id
			expectToBeDefined(albumId)

			await dbGetAllAndExpectLength('tracks', 2)

			await dbRemoveAlbum(albumId)

			await dbGetAllAndExpectLength('tracks', 0)
			await dbGetAllAndExpectLength('albums', 0)
		})

		it('should handle removing non-existent album gracefully', async () => {
			// Try to remove an album that doesn't exist
			await expect(dbRemoveAlbum(999)).resolves.toBeUndefined()
		})
	})

	describe('dbRemoveArtist', () => {
		it('should remove artist and all tracks by that artist', async () => {
			// Create two tracks with the same artist
			await dbImportTestTrack({
				name: 'Track 1',
				album: 'Album 1',
			})
			await dbImportTestTrack({
				name: 'Track 2',
				album: 'Album 2',
			})

			await dbGetAllAndExpectLength('tracks', 2)
			const artists = await dbGetAllAndExpectLength('artists', 1)
			const artistId = artists[0]?.id
			expectToBeDefined(artistId)

			await dbRemoveArtist(artistId)

			await dbGetAllAndExpectLength('tracks', 0)
			await dbGetAllAndExpectLength('artists', 0)
		})

		it('should handle removing non-existent artist gracefully', async () => {
			await expect(dbRemoveArtist(999)).resolves.toBeUndefined()
		})

		it('should remove tracks with multiple artists correctly', async () => {
			await dbImportTestTrack({
				artists: ['Artist 1', 'Artist 2'],
				album: 'Collaboration Album',
			})
			// Another track with only one of the artists
			const track2Id = await dbImportTestTrack({
				name: 'Track 2',
				artists: ['Artist 2'],
				album: 'Solo Album',
			})

			const artists = await dbGetAllAndExpectLength('artists', 2)

			const artist1 = artists.find((a) => a.name === 'Artist 1')
			expectToBeDefined(artist1?.id)

			await dbRemoveArtist(artist1.id)

			const tracksAfter = await dbGetAllAndExpectLength('tracks', 1)
			expect(tracksAfter[0]?.id, 'Expected Track 2 to remain').toBe(track2Id)

			const artistsAfter = await dbGetAllAndExpectLength('artists', 1)
			expect(artistsAfter[0]?.name, 'Expected Artist 2 to remain').toBe('Artist 2')
		})
	})
})
