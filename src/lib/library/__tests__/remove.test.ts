import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDatabase } from '$lib/db/database.ts'
import {
	clearDatabaseStores,
	dbGetAllAndExpectLength,
	expectToBeDefined,
} from '$lib/helpers/test-helpers.ts'
import { dbAddToPlayHistory } from '$lib/library/play-history-actions.ts'
import { dbCreatePlaylist } from '$lib/library/playlists-actions.ts'
import { dbRemoveAlbum, dbRemoveArtist, dbRemoveTracks } from '$lib/library/remove.ts'
import { dbImportTrack } from '$lib/library/scan-actions/scanner/import-track.ts'
import type { PlaylistEntry, UnknownTrack } from '$lib/library/types.ts'

const dbImportTestTrack = (overrides: Partial<UnknownTrack> = {}): Promise<number> => {
	const trackData: UnknownTrack = {
		uuid: crypto.randomUUID(),
		name: 'Test Track',
		album: 'Test Album',
		artists: ['Test Artist'],
		year: '2023',
		duration: 180,
		trackNo: 1,
		trackOf: 10,
		discNo: 1,
		discOf: 1,
		genre: ['Rock'],
		file: new File(['test'], 'test.mp3', { type: 'audio/mp3' }),
		scannedAt: Date.now(),
		fileName: 'test.mp3',
		directory: 1,
		...overrides,
	}

	return dbImportTrack(trackData, undefined)
}

const createTestPlaylist = async (name = 'Test Playlist'): Promise<number> =>
	dbCreatePlaylist(name, '')

const addTrackToPlaylist = async (playlistId: number, trackId: number): Promise<void> => {
	const db = await getDatabase()
	const playlistEntry: Omit<PlaylistEntry, 'id'> = {
		playlistId,
		trackId,
		addedAt: Date.now(),
	}
	await db.add('playlistEntries', playlistEntry as PlaylistEntry)
}

const addTracksToPlaylist = async (
	playlistId: number,
	trackIds: readonly number[],
): Promise<void> => {
	for (const trackId of trackIds) {
		await addTrackToPlaylist(playlistId, trackId)
	}
}

const addTracksToPlayHistory = async (trackIds: readonly number[]): Promise<void> => {
	for (const trackId of trackIds) {
		await dbAddToPlayHistory(trackId)
	}
}

const expectOnlyTrackWithReferences = async (trackId: number): Promise<void> => {
	const tracksAfter = await dbGetAllAndExpectLength('tracks', 1)
	expect(tracksAfter[0]?.id).toBe(trackId)

	const playlistEntriesAfter = await dbGetAllAndExpectLength('playlistEntries', 1)
	expect(playlistEntriesAfter[0]?.trackId).toBe(trackId)

	const playHistoryAfter = await dbGetAllAndExpectLength('playHistory', 1)
	expect(playHistoryAfter[0]?.trackId).toBe(trackId)
}

describe('remove functions', () => {
	beforeEach(async () => {
		await clearDatabaseStores()
	})

	describe('dbRemoveTracks', () => {
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
			await dbRemoveTracks([trackId])

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

			await dbRemoveTracks([track1Id])

			// Verify only one track is removed
			const tracksAfter = await dbGetAllAndExpectLength('tracks', 1)
			expect(tracksAfter[0]?.id).toBe(track2Id)

			// Verify album and artist are still there
			await dbGetAllAndExpectLength('albums', 1)
			await dbGetAllAndExpectLength('artists', 1)
		})

		it('should remove track from all playlists when removing the track', async () => {
			const trackId = await dbImportTestTrack()

			const playlistId1 = await createTestPlaylist('Test Playlist 1')
			const playlistId2 = await createTestPlaylist('Test Playlist 2')

			await dbGetAllAndExpectLength('playlists', 2)
			await addTracksToPlaylist(playlistId1, [trackId])
			await addTracksToPlaylist(playlistId2, [trackId])

			const playlistEntries = await dbGetAllAndExpectLength('playlistEntries', 2)
			expect(playlistEntries.every((entry) => entry.trackId === trackId)).toBe(true)

			await dbRemoveTracks([trackId])

			await dbGetAllAndExpectLength('playlistEntries', 0)

			await dbGetAllAndExpectLength('playlists', 2)
		})

		it('should remove deleted tracks from play history and keep unrelated entries', async () => {
			const track1Id = await dbImportTestTrack({ name: 'Track 1' })
			const track2Id = await dbImportTestTrack({ name: 'Track 2', album: 'Album 2' })

			await dbAddToPlayHistory(track1Id)
			await dbAddToPlayHistory(track2Id)

			await dbGetAllAndExpectLength('playHistory', 2)

			await dbRemoveTracks([track1Id])

			const historyEntries = await dbGetAllAndExpectLength('playHistory', 1)
			expect(historyEntries[0]?.trackId).toBe(track2Id)
		})

		it('should handle removing non-existent track gracefully', async () => {
			// Try to remove a track that doesn't exist
			await expect(dbRemoveTracks([999])).resolves.toBeUndefined()
		})

		it('should ignore duplicate track ids in one removal request', async () => {
			const trackId = await dbImportTestTrack()

			const playlistId = await createTestPlaylist()

			await addTracksToPlaylist(playlistId, [trackId, trackId])
			await addTracksToPlayHistory([trackId])

			await dbRemoveTracks([trackId, trackId])

			await dbGetAllAndExpectLength('tracks', 0)
			await dbGetAllAndExpectLength('albums', 0)
			await dbGetAllAndExpectLength('artists', 0)
			await dbGetAllAndExpectLength('playlistEntries', 0)
			await dbGetAllAndExpectLength('playHistory', 0)
		})

		it('should remove existing tracks and ignore missing ids in the same request', async () => {
			const track1Id = await dbImportTestTrack({ name: 'Track 1' })
			const track2Id = await dbImportTestTrack({
				name: 'Track 2',
				album: 'Album 2',
				artists: ['Artist 2'],
			})

			const playlistId = await createTestPlaylist()

			await addTracksToPlaylist(playlistId, [track1Id, track2Id])
			await addTracksToPlayHistory([track1Id, track2Id])

			await dbRemoveTracks([track1Id, 999])

			await expectOnlyTrackWithReferences(track2Id)

			const albumsAfter = await dbGetAllAndExpectLength('albums', 1)
			expect(albumsAfter[0]?.name).toBe('Album 2')

			const artistsAfter = await dbGetAllAndExpectLength('artists', 1)
			expect(artistsAfter[0]?.name).toBe('Artist 2')
		})

		it('should remove multiple tracks in one operation and clean up shared data once unused', async () => {
			const track1Id = await dbImportTestTrack({ name: 'Track 1', artists: ['Artist 1'] })
			const track2Id = await dbImportTestTrack({
				name: 'Track 2',
				album: 'Album 2',
				artists: ['Artist 2'],
			})

			const playlistId = await createTestPlaylist()

			await addTracksToPlaylist(playlistId, [track1Id, track2Id])

			await dbRemoveTracks([track1Id, track2Id])

			await dbGetAllAndExpectLength('tracks', 0)
			await dbGetAllAndExpectLength('albums', 0)
			await dbGetAllAndExpectLength('artists', 0)
			await dbGetAllAndExpectLength('playlistEntries', 0)
			await dbGetAllAndExpectLength('playlists', 1)
		})

		it('should return early for empty input', async () => {
			await expect(dbRemoveTracks([])).resolves.toBeUndefined()
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

		it('should clear playlists and play history for removed album tracks only', async () => {
			const albumTrack1Id = await dbImportTestTrack({ name: 'Track 1' })
			const albumTrack2Id = await dbImportTestTrack({ name: 'Track 2' })
			const survivorTrackId = await dbImportTestTrack({
				name: 'Track 3',
				album: 'Album 2',
				artists: ['Artist 2'],
			})

			const playlistId = await createTestPlaylist()

			await addTracksToPlaylist(playlistId, [albumTrack1Id, albumTrack2Id, survivorTrackId])

			await addTracksToPlayHistory([albumTrack1Id, albumTrack2Id, survivorTrackId])

			const albums = await dbGetAllAndExpectLength('albums', 2)
			const albumId = albums.find((album) => album.name === 'Test Album')?.id
			expectToBeDefined(albumId)

			await dbRemoveAlbum(albumId)

			await expectOnlyTrackWithReferences(survivorTrackId)
		})

		it('should keep shared artists that are still referenced by survivor tracks from other albums', async () => {
			await dbImportTestTrack({
				name: 'Album Track 1',
				album: 'Album 1',
				artists: ['Shared Artist', 'Album 1 Artist'],
			})
			await dbImportTestTrack({
				name: 'Album Track 2',
				album: 'Album 1',
				artists: ['Shared Artist'],
			})
			const survivorTrackId = await dbImportTestTrack({
				name: 'Survivor Track',
				album: 'Album 2',
				artists: ['Shared Artist', 'Album 2 Artist'],
			})

			const albums = await dbGetAllAndExpectLength('albums', 2)
			const albumId = albums.find((album) => album.name === 'Album 1')?.id
			expectToBeDefined(albumId)

			await dbRemoveAlbum(albumId)

			const tracksAfter = await dbGetAllAndExpectLength('tracks', 1)
			expect(tracksAfter[0]?.id).toBe(survivorTrackId)

			const albumsAfter = await dbGetAllAndExpectLength('albums', 1)
			expect(albumsAfter[0]?.name).toBe('Album 2')

			const artistsAfter = await dbGetAllAndExpectLength('artists', 2)
			expect(artistsAfter.map((artist) => artist.name).sort()).toEqual([
				'Album 2 Artist',
				'Shared Artist',
			])
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

		it('should clear playlists and play history for removed artist tracks only', async () => {
			const artistTrack1Id = await dbImportTestTrack({
				name: 'Track 1',
				album: 'Album 1',
				artists: ['Artist 1'],
			})
			const artistTrack2Id = await dbImportTestTrack({
				name: 'Track 2',
				album: 'Album 2',
				artists: ['Artist 1'],
			})
			const survivorTrackId = await dbImportTestTrack({
				name: 'Track 3',
				album: 'Album 3',
				artists: ['Artist 2'],
			})

			const playlistId = await createTestPlaylist()

			await addTracksToPlaylist(playlistId, [artistTrack1Id, artistTrack2Id, survivorTrackId])

			await addTracksToPlayHistory([artistTrack1Id, artistTrack2Id, survivorTrackId])

			const artists = await dbGetAllAndExpectLength('artists', 2)
			const artistId = artists.find((artist) => artist.name === 'Artist 1')?.id
			expectToBeDefined(artistId)

			await dbRemoveArtist(artistId)

			await expectOnlyTrackWithReferences(survivorTrackId)
		})

		it('should keep shared albums that are still referenced by survivor tracks from other artists', async () => {
			await dbImportTestTrack({
				name: 'Artist 1 Track 1',
				album: 'Shared Album',
				artists: ['Artist 1'],
			})
			await dbImportTestTrack({
				name: 'Artist 1 Track 2',
				album: 'Artist 1 Album',
				artists: ['Artist 1'],
			})
			const survivorTrackId = await dbImportTestTrack({
				name: 'Artist 2 Survivor',
				album: 'Shared Album',
				artists: ['Artist 2'],
			})

			const artists = await dbGetAllAndExpectLength('artists', 2)
			const artistId = artists.find((artist) => artist.name === 'Artist 1')?.id
			expectToBeDefined(artistId)

			await dbRemoveArtist(artistId)

			const tracksAfter = await dbGetAllAndExpectLength('tracks', 1)
			expect(tracksAfter[0]?.id).toBe(survivorTrackId)

			const albumsAfter = await dbGetAllAndExpectLength('albums', 1)
			expect(albumsAfter[0]?.name).toBe('Shared Album')

			const artistsAfter = await dbGetAllAndExpectLength('artists', 1)
			expect(artistsAfter[0]?.name).toBe('Artist 2')
		})
	})
})
