import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import {
	checkForV1LegacyDatabaseData,
	getV1LegacyDatabase,
	removeV1LegacyDatabase,
} from '$lib/db/v1-legacy/database'
import { migrateV1LegacyData } from '$lib/library/scan-actions/v1-legacy-migrate.ts'
import { clearDatabaseStores } from '../../shared'

const polyfillEnv = () => {
	// @ts-expect-error polyfill
	globalThis.navigator ??= {}
	// @ts-expect-error polyfill
	globalThis.navigator.locks ??= {
		request: (_: string, callback: () => unknown) => callback(),
	}
}

polyfillEnv()

const setupLegacyDatabase = async () => {
	const db = await getV1LegacyDatabase((db) => {
		db.createObjectStore('APP_DATA-1')
	})

	const tx = db.transaction(['APP_DATA-1'], 'readwrite')
	const store = tx.objectStore('APP_DATA-1')

	const tracks = [
		{
			id: 'test-track',
			fileWrapper: {
				type: 'file',
				file: new File([], 'test.mp3'),
			},
		} as const,
	]

	store.put(tracks, 'data-tracks')
}

describe('v1 app data migration', () => {
	afterEach(async () => {
		await removeV1LegacyDatabase()
		await clearDatabaseStores()
	})

	it('checkForV1LegacyDatabaseData returns false if no database exists', async () => {
		expect(await checkForV1LegacyDatabaseData()).toBe(false)
	})

	it('checkForV1LegacyDatabaseData returns true if database exists', async () => {
		await setupLegacyDatabase()
		expect(await checkForV1LegacyDatabaseData()).toBe(true)
	})

	it.skip('getV1LegacyDatabase returns the database', async () => {
		await setupLegacyDatabase()
		await migrateV1LegacyData()
	})
})
