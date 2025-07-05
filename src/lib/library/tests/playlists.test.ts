import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { getDatabase } from '$lib/db/database.ts'
import { dbCreatePlaylist } from '../playlists-actions.ts'

describe('playlists', () => {
	it('create new playlist', async () => {
		await dbCreatePlaylist('Test Playlist')

		const db = await getDatabase()
		const [firstPlaylist] = await db.getAll('playlists')

		expect(firstPlaylist).toEqual({
			id: expect.any(Number),
			name: 'Test Playlist',
			uuid: expect.any(String),
			createdAt: expect.any(Number),
		})
	})
})
