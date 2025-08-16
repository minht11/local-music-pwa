import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDatabase } from '$lib/db/database.ts'
import type { DatabaseChangeDetails } from '$lib/db/events.ts'
import {
	clearLibraryValueCache,
	getLibraryValue,
	LibraryValueNotFoundError,
	preloadLibraryValue,
	shouldRefetchLibraryValue,
} from '$lib/library/get/value.ts'
import { FAVORITE_PLAYLIST_ID, FAVORITE_PLAYLIST_UUID } from '$lib/library/types.ts'
import { clearDatabaseStores } from '../../shared.ts'

// Mock crypto.randomUUID for consistent UUIDs
vi.stubGlobal('crypto', {
	randomUUID: vi.fn(() => 'test-uuid-123'),
})

// Mock Date.now for consistent timestamps
vi.stubGlobal('Date', {
	now: vi.fn(() => 1234567890),
})

describe('getLibraryValue', () => {
	beforeEach(async () => {
		await clearDatabaseStores()
		clearLibraryValueCache()
		vi.clearAllMocks()
	})

	describe('tracks', () => {
		it('should return track data with favorite status false', async () => {
			const db = await getDatabase()

			// Insert a track
			const trackData = {
				id: 1,
				name: 'Test Track',
				album: 'Test Album',
				artists: ['Test Artist'],
				uuid: 'track-uuid-1',
				year: '2023',
				duration: 180,
				genre: ['Rock'],
				trackNo: 1,
				trackOf: 10,
				file: {} as File,
				scannedAt: 1234567890,
				fileName: 'test-track.mp3',
				directory: 1,
			}

			await db.add('tracks', trackData)

			const result = await getLibraryValue('tracks', 1)

			expect(result).toEqual({
				...trackData,
				type: 'track',
				favorite: false,
			})
		})

		it('should return track data with favorite status true when track is in favorites', async () => {
			const db = await getDatabase()

			// Insert a track
			const trackData = {
				id: 1,
				name: 'Test Track',
				album: 'Test Album',
				artists: ['Test Artist'],
				uuid: 'track-uuid-1',
				year: '2023',
				duration: 180,
				genre: ['Rock'],
				trackNo: 1,
				trackOf: 10,
				file: {} as File,
				scannedAt: 1234567890,
				fileName: 'test-track.mp3',
				directory: 1,
			}

			await db.add('tracks', trackData)

			// Add track to favorites
			await db.add('playlistEntries', {
				id: 1,
				playlistId: FAVORITE_PLAYLIST_ID,
				trackId: 1,
				addedAt: 1234567890,
			})

			const result = await getLibraryValue('tracks', 1)

			expect(result).toEqual({
				...trackData,
				type: 'track',
				favorite: true,
			})
		})

		it('should throw LibraryValueNotFoundError for non-existent track', async () => {
			await expect(getLibraryValue('tracks', 999)).rejects.toThrow(LibraryValueNotFoundError)
		})

		it('should return undefined for non-existent track when allowEmpty is true', async () => {
			const result = await getLibraryValue('tracks', 999, true)
			expect(result).toBeUndefined()
		})

		it('should return cached value on subsequent calls', async () => {
			const db = await getDatabase()

			const trackData = {
				id: 1,
				name: 'Test Track',
				album: 'Test Album',
				artists: ['Test Artist'],
				uuid: 'track-uuid-1',
				year: '2023',
				duration: 180,
				genre: ['Rock'],
				trackNo: 1,
				trackOf: 10,
				file: {} as File,
				scannedAt: 1234567890,
				fileName: 'test-track.mp3',
				directory: 1,
			}

			await db.add('tracks', trackData)

			// First call - should fetch from database
			const result1 = await getLibraryValue('tracks', 1)

			// Second call - should return cached value
			const result2 = await getLibraryValue('tracks', 1)

			expect(result1).toEqual(result2)
		})
	})

	describe('albums', () => {
		it('should return album data', async () => {
			const db = await getDatabase()

			const albumData = {
				id: 1,
				name: 'Test Album',
				uuid: 'album-uuid-1',
				artists: ['Test Artist'],
				year: '2023',
				image: new Blob(),
			}

			await db.add('albums', albumData)

			const result = await getLibraryValue('albums', 1)

			expect(result).toEqual({
				...albumData,
				type: 'album',
			})
		})

		it('should throw LibraryValueNotFoundError for non-existent album', async () => {
			await expect(getLibraryValue('albums', 999)).rejects.toThrow(LibraryValueNotFoundError)
		})

		it('should return undefined for non-existent album when allowEmpty is true', async () => {
			const result = await getLibraryValue('albums', 999, true)
			expect(result).toBeUndefined()
		})
	})

	describe('artists', () => {
		it('should return artist data', async () => {
			const db = await getDatabase()

			const artistData = {
				id: 1,
				name: 'Test Artist',
				uuid: 'artist-uuid-1',
			}

			await db.add('artists', artistData)

			const result = await getLibraryValue('artists', 1)

			expect(result).toEqual({
				...artistData,
				type: 'artist',
			})
		})

		it('should throw LibraryValueNotFoundError for non-existent artist', async () => {
			await expect(getLibraryValue('artists', 999)).rejects.toThrow(LibraryValueNotFoundError)
		})

		it('should return undefined for non-existent artist when allowEmpty is true', async () => {
			const result = await getLibraryValue('artists', 999, true)
			expect(result).toBeUndefined()
		})
	})

	describe('playlists', () => {
		it('should return playlist data', async () => {
			const db = await getDatabase()

			const playlistData = {
				id: 1,
				name: 'Test Playlist',
				description: '',
				uuid: 'playlist-uuid-1',
				createdAt: 1234567890,
			}

			await db.add('playlists', playlistData)

			const result = await getLibraryValue('playlists', 1)

			expect(result).toEqual({
				...playlistData,
				type: 'playlist',
			})
		})

		it('should return favorite playlist for FAVORITE_PLAYLIST_ID', async () => {
			const result = await getLibraryValue('playlists', FAVORITE_PLAYLIST_ID)

			expect(result).toEqual({
				type: 'playlist',
				id: FAVORITE_PLAYLIST_ID,
				uuid: FAVORITE_PLAYLIST_UUID,
				name: 'Favorites',
				createdAt: 0,
			})
		})

		it('should throw LibraryValueNotFoundError for non-existent playlist', async () => {
			await expect(getLibraryValue('playlists', 999)).rejects.toThrow(
				LibraryValueNotFoundError,
			)
		})

		it('should return undefined for non-existent playlist when allowEmpty is true', async () => {
			const result = await getLibraryValue('playlists', 999, true)
			expect(result).toBeUndefined()
		})
	})

	describe('preloadLibraryValue', () => {
		it('should preload track value into cache', async () => {
			const db = await getDatabase()

			const trackData = {
				id: 1,
				name: 'Test Track',
				album: 'Test Album',
				artists: ['Test Artist'],
				uuid: 'track-uuid-1',
				year: '2023',
				duration: 180,
				genre: ['Rock'],
				trackNo: 1,
				trackOf: 10,
				file: {} as File,
				scannedAt: 1234567890,
				fileName: 'test-track.mp3',
				directory: 1,
			}

			await db.add('tracks', trackData)

			// Preload the value
			await preloadLibraryValue('tracks', 1)

			// This should now return synchronously from cache
			const result = getLibraryValue('tracks', 1)

			// If it's synchronous, it should not be a Promise
			expect(result).not.toBeInstanceOf(Promise)
			expect(result).toEqual({
				...trackData,
				type: 'track',
				favorite: false,
			})
		})

		it('should not throw error for non-existent value', async () => {
			// Should not throw even though the value doesn't exist
			await expect(preloadLibraryValue('tracks', 999)).resolves.toBeUndefined()
		})
	})

	describe('shouldRefetchLibraryValue', () => {
		it('should return true when track is updated', () => {
			const changes: readonly DatabaseChangeDetails[] = [
				{
					storeName: 'tracks',
					operation: 'update',
					key: 1,
				},
			]

			const result = shouldRefetchLibraryValue('tracks', 1, changes)
			expect(result).toBe(true)
		})

		it('should return true when track favorite status changes', () => {
			const changes: readonly DatabaseChangeDetails[] = [
				{
					storeName: 'playlistEntries',
					operation: 'add',
					key: 1,
					value: {
						id: 1,
						playlistId: FAVORITE_PLAYLIST_ID,
						trackId: 1,
						addedAt: 1234567890,
					},
				},
			]

			const result = shouldRefetchLibraryValue('tracks', 1, changes)
			expect(result).toBe(true)
		})

		it('should return false when unrelated changes occur', () => {
			const changes: readonly DatabaseChangeDetails[] = [
				{
					storeName: 'tracks',
					operation: 'update',
					key: 2,
				},
			]

			const result = shouldRefetchLibraryValue('tracks', 1, changes)
			expect(result).toBe(false)
		})

		it('should return true when album is updated', () => {
			const changes: readonly DatabaseChangeDetails[] = [
				{
					storeName: 'albums',
					operation: 'update',
					key: 1,
				},
			]

			const result = shouldRefetchLibraryValue('albums', 1, changes)
			expect(result).toBe(true)
		})

		it('should return true when artist is deleted', () => {
			const changes: readonly DatabaseChangeDetails[] = [
				{
					storeName: 'artists',
					operation: 'delete',
					key: 1,
				},
			]

			const result = shouldRefetchLibraryValue('artists', 1, changes)
			expect(result).toBe(true)
		})

		it('should return true when playlist is updated', () => {
			const changes: readonly DatabaseChangeDetails[] = [
				{
					storeName: 'playlists',
					operation: 'update',
					key: 1,
				},
			]

			const result = shouldRefetchLibraryValue('playlists', 1, changes)
			expect(result).toBe(true)
		})

		it('should return false when no relevant changes occur', () => {
			const changes: readonly DatabaseChangeDetails[] = [
				{
					storeName: 'albums',
					operation: 'update',
					key: 2,
				},
			]

			const result = shouldRefetchLibraryValue('tracks', 1, changes)
			expect(result).toBe(false)
		})
	})

	describe('LibraryValueNotFoundError', () => {
		it('should have correct message and name', () => {
			const error = new LibraryValueNotFoundError('tracks:1')

			expect(error.message).toBe('Value not found. Cache key: tracks:1')
			expect(error.name).toBe('LibraryValueNotFoundError')
			expect(error).toBeInstanceOf(Error)
		})
	})

	describe('concurrent access', () => {
		it('should handle concurrent requests for same value', async () => {
			const db = await getDatabase()

			const trackData = {
				id: 1,
				name: 'Test Track',
				album: 'Test Album',
				artists: ['Test Artist'],
				uuid: 'track-uuid-1',
				year: '2023',
				duration: 180,
				genre: ['Rock'],
				trackNo: 1,
				trackOf: 10,
				file: {} as File,
				scannedAt: 1234567890,
				fileName: 'test-track.mp3',
				directory: 1,
			}

			await db.add('tracks', trackData)

			// Make multiple concurrent requests
			const promises = [
				getLibraryValue('tracks', 1),
				getLibraryValue('tracks', 1),
				getLibraryValue('tracks', 1),
			]

			const results = await Promise.all(promises)

			// All results should be identical
			expect(results[0]).toEqual(results[1])
			expect(results[1]).toEqual(results[2])
			expect(results[0]).toEqual({
				...trackData,
				type: 'track',
				favorite: false,
			})
		})
	})

	describe('error handling', () => {
		it('should handle LibraryValueNotFoundError correctly', async () => {
			await expect(getLibraryValue('tracks', 999)).rejects.toThrow(LibraryValueNotFoundError)
			await expect(getLibraryValue('albums', 999)).rejects.toThrow(LibraryValueNotFoundError)
			await expect(getLibraryValue('artists', 999)).rejects.toThrow(LibraryValueNotFoundError)
			await expect(getLibraryValue('playlists', 999)).rejects.toThrow(
				LibraryValueNotFoundError,
			)
		})
	})
})
