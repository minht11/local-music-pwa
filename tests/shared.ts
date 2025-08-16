import { getDatabase } from "$lib/db/database"

/** @public */
export const clearDatabaseStores = async () => {
	const db = await getDatabase()
	for (const storeName of db.objectStoreNames) {
		await db.clear(storeName)
	}
}
