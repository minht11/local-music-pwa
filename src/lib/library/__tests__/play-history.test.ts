import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDatabase } from '$lib/db/database.ts'
import { clearDatabaseStores } from '$lib/helpers/test-helpers.ts'
import { dbAddToPlayHistory } from '$lib/library/play-history-actions.ts'
import { LEGACY_NO_NATIVE_DIRECTORY, type Track } from '$lib/library/types.ts'

const seedTrack = async (id: number) => {
	const db = await getDatabase()
	const trackData: Track = {
		id,
		uuid: `track-${id}`,
		name: `Track ${id}`,
		artists: ['Artist'],
		album: 'Album',
		year: '2026',
		duration: 180,
		genre: [],
		trackNo: 1,
		trackOf: 1,
		discNo: 1,
		discOf: 1,
		fileName: `track-${id}.mp3`,
		directory: LEGACY_NO_NATIVE_DIRECTORY,
		scannedAt: Date.now(),
		file: new File(['x'], `track-${id}.mp3`, { type: 'audio/mpeg' }),
	}

	await db.add('tracks', trackData)
}

describe('play history actions', () => {
	afterEach(async () => {
		vi.restoreAllMocks()
		await clearDatabaseStores()
	})

	it('keeps only one entry per track id', async () => {
		let now = 100
		vi.spyOn(Date, 'now').mockImplementation(() => {
			now += 1
			return now
		})

		await seedTrack(1)
		await seedTrack(2)

		await dbAddToPlayHistory(1)
		await dbAddToPlayHistory(2)
		await dbAddToPlayHistory(1)

		const db = await getDatabase()
		const entries = await db.getAllFromIndex('playHistory', 'playedAt')

		expect(entries).toHaveLength(2)
		expect(entries.filter((entry) => entry.trackId === 1)).toHaveLength(1)
		expect(entries.map((entry) => entry.trackId)).toEqual([2, 1])
	})

	it('does not increase history size when replaying the same track', async () => {
		let now = 200
		vi.spyOn(Date, 'now').mockImplementation(() => {
			now += 1
			return now
		})

		await seedTrack(10)

		await dbAddToPlayHistory(10)
		await dbAddToPlayHistory(10)
		await dbAddToPlayHistory(10)

		const db = await getDatabase()
		const entries = await db.getAll('playHistory')

		expect(entries).toHaveLength(1)
		expect(entries[0]?.trackId).toBe(10)
	})

	it('keeps only the most recent 100 history entries', async () => {
		let now = 300
		vi.spyOn(Date, 'now').mockImplementation(() => {
			now += 1
			return now
		})

		for (let trackId = 1; trackId <= 120; trackId += 1) {
			await seedTrack(trackId)
			await dbAddToPlayHistory(trackId)
		}

		const db = await getDatabase()
		const entries = await db.getAllFromIndex('playHistory', 'playedAt')
		const trackIds = entries.map((entry) => entry.trackId)

		expect(entries).toHaveLength(100)
		expect(trackIds[0]).toBe(21)
		expect(trackIds.at(-1)).toBe(120)
		expect(trackIds).not.toContain(20)
	})
})
