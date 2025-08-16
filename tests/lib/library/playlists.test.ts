import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDatabase } from '$lib/db/database.ts'
import { dbCreatePlaylist } from '$lib/library/playlists-actions.ts'
import { clearDatabaseStores } from '../../shared.ts'

// crypto.randomUUID
vi.stubGlobal('crypto', {
	randomUUID: vi.fn(() => 'test-uuid'),
})

vi.stubGlobal('Date', {
	now: vi.fn(() => 1234567890),
})

describe('playlists', () => {
	beforeEach(async () => {
		await clearDatabaseStores()
	})

	it('create new playlist', async () => {
		await dbCreatePlaylist('Test Playlist')

		const db = await getDatabase()
		const [firstPlaylist] = await db.getAll('playlists')

		expect(firstPlaylist).toMatchSnapshot()
	})
})
