import { getDatabase } from '$lib/db/database.ts'
import { dispatchDatabaseChangedEvent } from '$lib/db/events.ts'
import { createUIAction } from '$lib/helpers/ui-action.ts'
import type { PlayHistoryEntry } from './types.ts'

const PLAY_HISTORY_LIMIT = 100

const notifyPlayHistoryChange = () => {
	dispatchDatabaseChangedEvent({
		storeName: 'playHistory',
	})
}

export const dbAddToPlayHistory = async (trackId: number): Promise<void> => {
	const db = await getDatabase()
	const tx = db.transaction('playHistory', 'readwrite')
	const store = tx.objectStore('playHistory')

	const existingEntryId = await store.index('trackId').getKey(trackId)

	const newEntry: Omit<PlayHistoryEntry, 'id'> & { id?: number } = {
		trackId,
		playedAt: Date.now(),
	}

	if (existingEntryId !== undefined) {
		newEntry.id = existingEntryId
	}

	await store.put(newEntry as PlayHistoryEntry)

	let cursor = await store.index('playedAt').openCursor()
	cursor = (await cursor?.advance(PLAY_HISTORY_LIMIT)) ?? null

	// Delete all entries that exceed the limit
	while (cursor) {
		await cursor.delete()
		cursor = await cursor.continue()
	}

	notifyPlayHistoryChange()
}

export const dbRemoveFromPlayHistory = async (trackId: number): Promise<void> => {
	const db = await getDatabase()
	const tx = db.transaction('playHistory', 'readwrite')
	const store = tx.objectStore('playHistory')

	const historyId = await store.index('trackId').getKey(trackId)
	if (historyId !== undefined) {
		await store.delete(historyId)
	}
	await tx.done

	notifyPlayHistoryChange()
}

export const dbClearPlayHistory = async (): Promise<void> => {
	const db = await getDatabase()
	await db.clear('playHistory')

	notifyPlayHistoryChange()
}

export const clearPlayHistory = createUIAction(false, dbClearPlayHistory)
