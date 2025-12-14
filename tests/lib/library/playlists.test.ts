import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDatabase } from '$lib/db/database.ts'
import {
	createPlaylist,
	dbAddTracksToPlaylistsWithTx,
	dbBatchModifyPlaylistsSelection,
	dbCreatePlaylist,
	dbRemovePlaylist,
	dbRemoveTracksFromPlaylistsWithTx,
	getPlaylistEntriesDatabaseStore,
	removeTrackEntryFromPlaylist,
	toggleFavoriteTrack,
	type UpdatePlaylistOptions,
	updatePlaylist,
} from '$lib/library/playlists-actions.ts'
import { dbImportTrack } from '$lib/library/scan-actions/scanner/import-track.ts'
import { FAVORITE_PLAYLIST_ID, type UnknownTrack } from '$lib/library/types.ts'
import { clearDatabaseStores, dbGetAllAndExpectLength, expectToBeDefined } from '../../shared.ts'

vi.mock('$lib/components/snackbar/snackbar', () => ({
	snackbar: Object.assign(vi.fn(), {
		unexpectedError: vi.fn(),
	}),
}))

let uuidCounter = 0

vi.stubGlobal('crypto', {
	randomUUID: vi.fn(() => {
		uuidCounter += 1
		return `test-uuid-${uuidCounter}`
	}),
})

vi.stubGlobal('Date', {
	now: vi.fn(() => 1234567890),
})

let trackCounter = 0

const dbImportTestTrack = async (overrides: Partial<UnknownTrack> = {}): Promise<number> => {
	trackCounter += 1
	const trackData: UnknownTrack = {
		uuid: `test-track-uuid-${trackCounter}`,
		name: `Test Track ${trackCounter}`,
		album: 'Test Album',
		artists: ['Test Artist'],
		year: '2023',
		duration: 180,
		trackNo: 1,
		trackOf: 10,
		discNo: 1,
		discOf: 1,
		genre: ['Rock'],
		file: new File(['test'], 'test.mp3', { type: 'audio/mp3' }) as UnknownTrack['file'],
		scannedAt: Date.now(),
		fileName: `test-${trackCounter}.mp3`,
		directory: 1,
		...overrides,
	}

	return await dbImportTrack(trackData, undefined)
}

describe('playlists', () => {
	beforeEach(async () => {
		await clearDatabaseStores()
		vi.clearAllMocks()
		trackCounter = 0
		uuidCounter = 0
	})

	describe('playlist creation', () => {
		it('creates new playlist with all fields', async () => {
			await dbCreatePlaylist('Test Playlist', 'My description')

			const db = await getDatabase()
			const [playlist] = await db.getAll('playlists')

			expect(playlist?.name).toBe('Test Playlist')
			expect(playlist?.description).toBe('My description')
			expect(playlist?.uuid).toBe('test-uuid-1')
			expect(playlist?.createdAt).toBe(1234567890)
		})
	})

	describe('UI wrapper functions', () => {
		it('creates playlist via UI wrapper', async () => {
			await createPlaylist('UI Playlist', 'Created via UI')

			await dbGetAllAndExpectLength('playlists', 1)

			const db = await getDatabase()
			const [playlist] = await db.getAll('playlists')

			expectToBeDefined(playlist)
			expect(playlist.name).toBe('UI Playlist')
			expect(playlist.description).toBe('Created via UI')
		})

		it('removes track entry from playlist via UI action', async () => {
			const trackId = await dbImportTestTrack()
			const playlistId = await dbCreatePlaylist('Test Playlist', '')

			const store = await getPlaylistEntriesDatabaseStore()
			await dbAddTracksToPlaylistsWithTx(store, {
				playlistIds: [playlistId],
				trackIds: [trackId],
			})

			const db = await getDatabase()
			const [entry] = await db.getAll('playlistEntries')
			expectToBeDefined(entry)

			await removeTrackEntryFromPlaylist(entry.id)

			await dbGetAllAndExpectLength('playlistEntries', 0)
		})
	})

	describe('playlist updates', () => {
		it('updates playlist name and description', async () => {
			const playlistId = await dbCreatePlaylist('Original Name', 'Original description')

			const updateOptions: UpdatePlaylistOptions = {
				id: playlistId,
				name: 'Updated Name',
				description: 'Updated description',
			}

			const result = await updatePlaylist(updateOptions)

			expect(result).toBe(true)

			const db = await getDatabase()
			const [playlist] = await db.getAll('playlists')

			expectToBeDefined(playlist)
			expect(playlist.name).toBe('Updated Name')
			expect(playlist.description).toBe('Updated description')
			expect(playlist.uuid).toBe('test-uuid-1')
			expect(playlist.createdAt).toBe(1234567890)
		})

		it('fails to update non-existent playlist', async () => {
			const updateOptions: UpdatePlaylistOptions = {
				id: 999,
				name: 'Non-existent',
				description: 'Should fail',
			}

			const result = await updatePlaylist(updateOptions)

			expect(result).toBe(false)
		})
	})

	describe('playlist removal', () => {
		it('removes playlist and associated entries', async () => {
			const trackId = await dbImportTestTrack()
			const playlistId = await dbCreatePlaylist('Test Playlist', '')

			const store = await getPlaylistEntriesDatabaseStore()
			await dbAddTracksToPlaylistsWithTx(store, {
				playlistIds: [playlistId],
				trackIds: [trackId],
			})

			await dbGetAllAndExpectLength('playlistEntries', 1)

			await dbRemovePlaylist(playlistId)

			await dbGetAllAndExpectLength('playlists', 0)
			await dbGetAllAndExpectLength('playlistEntries', 0)
		})

		it('removes only entries for specific playlist', async () => {
			const trackId = await dbImportTestTrack()
			const playlist1Id = await dbCreatePlaylist('Playlist 1', '')
			const playlist2Id = await dbCreatePlaylist('Playlist 2', '')

			const store = await getPlaylistEntriesDatabaseStore()
			await dbAddTracksToPlaylistsWithTx(store, {
				playlistIds: [playlist1Id, playlist2Id],
				trackIds: [trackId],
			})

			await dbGetAllAndExpectLength('playlistEntries', 2)

			await dbRemovePlaylist(playlist1Id)

			await dbGetAllAndExpectLength('playlists', 1)
			const [remainingEntry] = await dbGetAllAndExpectLength('playlistEntries', 1)
			expectToBeDefined(remainingEntry)
			expect(remainingEntry.playlistId).toBe(playlist2Id)
		})
	})

	describe('playlist entries management', () => {
		it('adds tracks to multiple playlists', async () => {
			const track1Id = await dbImportTestTrack({ name: 'Track 1' })
			const track2Id = await dbImportTestTrack({ name: 'Track 2' })
			const playlist1Id = await dbCreatePlaylist('Playlist 1', '')
			const playlist2Id = await dbCreatePlaylist('Playlist 2', '')

			const store = await getPlaylistEntriesDatabaseStore()
			const changes = await dbAddTracksToPlaylistsWithTx(store, {
				playlistIds: [playlist1Id, playlist2Id],
				trackIds: [track1Id, track2Id],
			})

			expect(changes).toHaveLength(4)
			await dbGetAllAndExpectLength('playlistEntries', 4)

			const db = await getDatabase()
			const entries = await db.getAll('playlistEntries')
			const playlist1Entries = entries.filter((e) => e.playlistId === playlist1Id)
			const playlist2Entries = entries.filter((e) => e.playlistId === playlist2Id)

			expect(playlist1Entries).toHaveLength(2)
			expect(playlist2Entries).toHaveLength(2)
		})

		it('removes tracks from specific playlists', async () => {
			const track1Id = await dbImportTestTrack({ name: 'Track 1' })
			const track2Id = await dbImportTestTrack({ name: 'Track 2' })
			const playlist1Id = await dbCreatePlaylist('Playlist 1', '')
			const playlist2Id = await dbCreatePlaylist('Playlist 2', '')

			let store = await getPlaylistEntriesDatabaseStore()
			await dbAddTracksToPlaylistsWithTx(store, {
				playlistIds: [playlist1Id, playlist2Id],
				trackIds: [track1Id, track2Id],
			})

			await dbGetAllAndExpectLength('playlistEntries', 4)

			store = await getPlaylistEntriesDatabaseStore()
			const changes = await dbRemoveTracksFromPlaylistsWithTx(store, {
				playlistIds: [playlist1Id],
				trackIds: [track1Id],
			})

			expect(changes).toHaveLength(1)
			await dbGetAllAndExpectLength('playlistEntries', 3)

			const db = await getDatabase()
			const entries = await db.getAll('playlistEntries')
			const hasTrack1InPlaylist1 = entries.some(
				(e) => e.playlistId === playlist1Id && e.trackId === track1Id,
			)
			expect(hasTrack1InPlaylist1).toBe(false)
		})

		it('batch modifies playlist selections', async () => {
			const track1Id = await dbImportTestTrack({ name: 'Track 1' })
			const track2Id = await dbImportTestTrack({ name: 'Track 2' })
			const playlist1Id = await dbCreatePlaylist('Playlist 1', '')
			const playlist2Id = await dbCreatePlaylist('Playlist 2', '')
			const playlist3Id = await dbCreatePlaylist('Playlist 3', '')

			const store = await getPlaylistEntriesDatabaseStore()
			await dbAddTracksToPlaylistsWithTx(store, {
				playlistIds: [playlist1Id],
				trackIds: [track1Id, track2Id],
			})

			await dbGetAllAndExpectLength('playlistEntries', 2)

			const result = await dbBatchModifyPlaylistsSelection({
				trackIds: [track1Id, track2Id],
				playlistsIdsAddTo: [playlist2Id, playlist3Id],
				playlistsIdsRemoveFrom: [playlist1Id],
			})

			expect(result).toBe(true)
			await dbGetAllAndExpectLength('playlistEntries', 4)

			const db = await getDatabase()
			const entries = await db.getAll('playlistEntries')
			const playlist1Entries = entries.filter((e) => e.playlistId === playlist1Id)
			const playlist2Entries = entries.filter((e) => e.playlistId === playlist2Id)
			const playlist3Entries = entries.filter((e) => e.playlistId === playlist3Id)

			expect(playlist1Entries).toHaveLength(0)
			expect(playlist2Entries).toHaveLength(2)
			expect(playlist3Entries).toHaveLength(2)
		})

		it('returns false when no changes are made', async () => {
			const result = await dbBatchModifyPlaylistsSelection({
				trackIds: [],
				playlistsIdsAddTo: [],
				playlistsIdsRemoveFrom: [],
			})

			expect(result).toBe(false)
		})
	})

	describe('favorites functionality', () => {
		it('adds track to favorites', async () => {
			const trackId = await dbImportTestTrack()

			await toggleFavoriteTrack(false, trackId)

			const db = await getDatabase()
			const [entry] = await db.getAll('playlistEntries')

			expectToBeDefined(entry)
			expect(entry.playlistId).toBe(FAVORITE_PLAYLIST_ID)
			expect(entry.trackId).toBe(trackId)
			expect(entry.addedAt).toBe(1234567890)
		})

		it('removes track from favorites', async () => {
			const trackId = await dbImportTestTrack()

			await toggleFavoriteTrack(false, trackId)
			await dbGetAllAndExpectLength('playlistEntries', 1)

			await toggleFavoriteTrack(true, trackId)
			await dbGetAllAndExpectLength('playlistEntries', 0)
		})
	})

	describe('playlist entries data structure', () => {
		it('creates entries with correct structure', async () => {
			const trackId = await dbImportTestTrack()
			const playlistId = await dbCreatePlaylist('Test Playlist', '')

			const store = await getPlaylistEntriesDatabaseStore()
			await dbAddTracksToPlaylistsWithTx(store, {
				playlistIds: [playlistId],
				trackIds: [trackId],
			})

			const db = await getDatabase()
			const [entry] = await db.getAll('playlistEntries')

			expect(entry).toEqual({
				id: expect.any(Number),
				playlistId,
				trackId,
				addedAt: 1234567890,
			})
		})

		it('maintains chronological order of entries', async () => {
			const track1Id = await dbImportTestTrack({ name: 'Track 1' })
			const track2Id = await dbImportTestTrack({ name: 'Track 2' })
			const playlistId = await dbCreatePlaylist('Test Playlist', '')

			const store = await getPlaylistEntriesDatabaseStore()

			vi.mocked(Date.now).mockReturnValueOnce(1000)
			await dbAddTracksToPlaylistsWithTx(store, {
				playlistIds: [playlistId],
				trackIds: [track1Id],
			})

			vi.mocked(Date.now).mockReturnValueOnce(2000)
			await dbAddTracksToPlaylistsWithTx(store, {
				playlistIds: [playlistId],
				trackIds: [track2Id],
			})

			const db = await getDatabase()
			const entries = await db.getAll('playlistEntries')
			entries.sort((a, b) => a.addedAt - b.addedAt)

			expect(entries).toHaveLength(2)
			expect(entries[0]?.trackId).toBe(track1Id)
			expect(entries[0]?.addedAt).toBe(1000)
			expect(entries[1]?.trackId).toBe(track2Id)
			expect(entries[1]?.addedAt).toBe(2000)
		})
	})
})
