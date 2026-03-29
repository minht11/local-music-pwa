import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDatabase } from '$lib/db/database.ts'
import { clearDatabaseStores } from '$lib/helpers/test-helpers.ts'
import { dbAddToPlayHistory } from '$lib/library/play-history-actions.ts'

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
