import { expect } from 'vitest'
import { type AppStoreNames, getDatabase } from '$lib/db/database.ts'

/** @public */
export const clearDatabaseStores = async () => {
	const db = await getDatabase()
	for (const storeName of db.objectStoreNames) {
		await db.clear(storeName)
	}
}

/** @public */
export function expectToBeDefined<T>(value: T | undefined): asserts value is T {
	expect(value).toBeDefined()
}

/** @public */
export const dbGetAllAndExpectLength = async <S extends AppStoreNames>(
	storeName: S,
	expectedCount: number,
	message?: string,
) => {
	const db = await getDatabase()
	const items = await db.getAll(storeName)
	expect(items, message).toHaveLength(expectedCount)

	return items
}
