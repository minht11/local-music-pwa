import 'fake-indexeddb/auto'
import { describe, expect, it, beforeEach } from 'vitest'
import { getDatabase } from '$lib/db/database.ts'
import { dbRemoveTrack, dbRemoveAlbum, dbRemoveArtist } from '$lib/library/remove.ts'
import { dbImportTrack } from '$lib/library/scan-actions/scanner/import-track.ts'
import { dbCreatePlaylist } from '$lib/library/playlists-actions.ts'
import type { UnknownTrack } from '$lib/library/types.ts'

export function expectToBeDefined<T>(
	value: T | undefined
): asserts value is T {
	expect(value).toBeDefined()
}

// Helper function to create test track data
const createTestTrack = (overrides: Partial<UnknownTrack> = {}): UnknownTrack => ({
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
})

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
		const db = await getDatabase()

		for (const storeName of db.objectStoreNames) {
			await db.clear(storeName)
		}
	})

	describe('dbRemoveTrack', () => {
		it('should remove a track and clean up unused album and artist', async () => {
			// Create a track
			const trackData = createTestTrack()
			const trackId = await dbImportTrack(trackData, undefined)

			const db = await getDatabase()
			
			// Verify track, album, and artist were created
			const track = await db.get('tracks', trackId)
			expect(track).toBeTruthy()

			const albums = await db.getAll('albums')
			expect(albums).toHaveLength(1)
			expect(albums[0]?.name).toBe('Test Album')

			const artists = await db.getAll('artists')
			expect(artists).toHaveLength(1)
			expect(artists[0]?.name).toBe('Test Artist')

			// Remove the track
			await dbRemoveTrack(trackId)

			// Verify track is removed
			const removedTrack = await db.get('tracks', trackId)
			expect(removedTrack).toBeUndefined()

			// Verify album and artist are also removed (cleanup)
			const albumsAfter = await db.getAll('albums')
			expect(albumsAfter).toHaveLength(0)

			const artistsAfter = await db.getAll('artists')
			expect(artistsAfter).toHaveLength(0)
		})

		it('should not remove album or artist if still referenced by other tracks', async () => {
			// Create two tracks with the same album and artist
			const track1Data = createTestTrack({ name: 'Track 1' })
			const track2Data = createTestTrack({ name: 'Track 2' })
			
			const track1Id = await dbImportTrack(track1Data, undefined)
			const track2Id = await dbImportTrack(track2Data, undefined)

			const db = await getDatabase()

			// Verify we have 2 tracks, 1 album, 1 artist
			const tracks = await db.getAll('tracks')
			expect(tracks).toHaveLength(2)

			const albums = await db.getAll('albums')
			expect(albums).toHaveLength(1)

			const artists = await db.getAll('artists')
			expect(artists).toHaveLength(1)

			// Remove one track
			await dbRemoveTrack(track1Id)

			// Verify only one track is removed
			const tracksAfter = await db.getAll('tracks')
			expect(tracksAfter).toHaveLength(1)
			expect(tracksAfter[0]?.id).toBe(track2Id)

			// Verify album and artist are still there
			const albumsAfter = await db.getAll('albums')
			expect(albumsAfter).toHaveLength(1)

			const artistsAfter = await db.getAll('artists')
			expect(artistsAfter).toHaveLength(1)
		})

		it('should remove track from all playlists when removing the track', async () => {
			// Create a track
			const trackData = createTestTrack()
			const trackId = await dbImportTrack(trackData, undefined)

			// Create a playlist and add the track to it
			await dbCreatePlaylist('Test Playlist')
			const db = await getDatabase()
			const playlists = await db.getAll('playlists')
			expect(playlists).toHaveLength(1)
			const playlistId = playlists[0]?.id
			expectToBeDefined(playlistId)

			await addTrackToPlaylist(playlistId, trackId)

			// Verify playlist entry exists
			const playlistEntries = await db.getAll('playlistEntries')
			expect(playlistEntries).toHaveLength(1)
			expect(playlistEntries[0]?.trackId).toBe(trackId)

			// Remove the track
			await dbRemoveTrack(trackId)

			// Verify playlist entry is removed
			const playlistEntriesAfter = await db.getAll('playlistEntries')
			expect(playlistEntriesAfter).toHaveLength(0)

			// Verify playlist still exists
			const playlistsAfter = await db.getAll('playlists')
			expect(playlistsAfter).toHaveLength(1)
		})

		it('should handle removing non-existent track gracefully', async () => {
			// Try to remove a track that doesn't exist
			await expect(dbRemoveTrack(999)).resolves.toBeUndefined()
		})

		it('should handle track without album or artist', async () => {
			// Create a track without album or artists
			const trackData = createTestTrack({ 
				album: undefined,
				artists: []
			})
			const trackId = await dbImportTrack(trackData, undefined)

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
			const track1Data = createTestTrack({ name: 'Track 1' })
			const track2Data = createTestTrack({ name: 'Track 2' })
			
			await dbImportTrack(track1Data, undefined)
			await dbImportTrack(track2Data, undefined)

			const db = await getDatabase()
			
			// Get the album ID
			const albums = await db.getAll('albums')
			expect(albums).toHaveLength(1)
			const albumId = albums[0]?.id
			expectToBeDefined(albumId)

			// Verify tracks exist
			const tracks = await db.getAll('tracks')
			expect(tracks).toHaveLength(2)

			// Remove the album
			await dbRemoveAlbum(albumId)

			// Verify all tracks are removed
			const tracksAfter = await db.getAll('tracks')
			expect(tracksAfter).toHaveLength(0)

			// Verify album is removed (through cascade deletion when no tracks reference it)
			const albumsAfter = await db.getAll('albums')
			expect(albumsAfter).toHaveLength(0)
		})

		it('should handle removing non-existent album gracefully', async () => {
			// Try to remove an album that doesn't exist
			await expect(dbRemoveAlbum(999)).resolves.toBeUndefined()
		})

		it('should remove album with no tracks', async () => {
			// Create an album by creating and then removing its track
			const trackData = createTestTrack()
			const trackId = await dbImportTrack(trackData, undefined)

			const db = await getDatabase()
			const albums = await db.getAll('albums')
			expect(albums).toHaveLength(1)
			const albumId = albums[0]?.id
			expectToBeDefined(albumId)

			// Remove the track first
			await dbRemoveTrack(trackId)

			// Now try to remove the album (it should already be gone)
			await dbRemoveAlbum(albumId)

			// Verify album is still removed
			const albumsAfter = await db.getAll('albums')
			expect(albumsAfter).toHaveLength(0)
		})
	})

	describe('dbRemoveArtist', () => {
		it('should remove artist and all tracks by that artist', async () => {
			// Create two tracks with the same artist
			const track1Data = createTestTrack({ 
				name: 'Track 1',
				album: 'Album 1'
			})
			const track2Data = createTestTrack({ 
				name: 'Track 2',
				album: 'Album 2'
			})
			
			await dbImportTrack(track1Data, undefined)
			await dbImportTrack(track2Data, undefined)

			const db = await getDatabase()
			
			// Get the artist ID
			const artists = await db.getAll('artists')
			expect(artists).toHaveLength(1)
			const artistId = artists[0]?.id
			expectToBeDefined(artistId)

			// Verify tracks exist
			const tracks = await db.getAll('tracks')
			expect(tracks).toHaveLength(2)

			// Remove the artist
			await dbRemoveArtist(artistId)

			// Verify all tracks are removed
			const tracksAfter = await db.getAll('tracks')
			expect(tracksAfter).toHaveLength(0)

			// Verify artist is removed (through cascade deletion when no tracks reference it)
			const artistsAfter = await db.getAll('artists')
			expect(artistsAfter).toHaveLength(0)
		})

		it('should handle removing non-existent artist gracefully', async () => {
			// Try to remove an artist that doesn't exist
			await expect(dbRemoveArtist(999)).resolves.toBeUndefined()
		})

		it('should remove tracks with multiple artists correctly', async () => {
			// Create a track with multiple artists
			const track1Data = createTestTrack({ 
				artists: ['Artist 1', 'Artist 2'],
				album: 'Collaboration Album'
			})
			
			// Create another track with only one of the artists
			const track2Data = createTestTrack({
				name: 'Track 2',
				artists: ['Artist 2'],
				album: 'Solo Album'
			})
			
			await dbImportTrack(track1Data, undefined)
			const track2Id = await dbImportTrack(track2Data, undefined)

			const db = await getDatabase()
			
			// Verify we have 2 artists
			const artists = await db.getAll('artists')
			expect(artists).toHaveLength(2)
			
			// Find Artist 1
			const artist1 = artists.find(a => a.name === 'Artist 1')
			expect(artist1).toBeTruthy()
			expectToBeDefined(artist1?.id)

			// Remove Artist 1
			await dbRemoveArtist(artist1.id)

			// Verify track1 is removed (it contained Artist 1)
			const tracksAfter = await db.getAll('tracks')
			expect(tracksAfter).toHaveLength(1)
			expect(tracksAfter[0]?.id).toBe(track2Id)

			// Verify Artist 1 is removed but Artist 2 remains
			const artistsAfter = await db.getAll('artists')
			expect(artistsAfter).toHaveLength(1)
			expect(artistsAfter[0]?.name).toBe('Artist 2')
		})

		it('should remove artist with no tracks', async () => {
			// Create an artist by creating and then removing its track
			const trackData = createTestTrack()
			const trackId = await dbImportTrack(trackData, undefined)

			const db = await getDatabase()
			const artists = await db.getAll('artists')
			expect(artists).toHaveLength(1)
			const artistId = artists[0]?.id
			expectToBeDefined(artistId)

			// Remove the track first
			await dbRemoveTrack(trackId)

			// Now try to remove the artist (it should already be gone)
			await dbRemoveArtist(artistId)

			// Verify artist is still removed
			const artistsAfter = await db.getAll('artists')
			expect(artistsAfter).toHaveLength(0)
		})
	})
})
