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
	const tx = db.transaction(['tracks', 'playHistory'], 'readwrite')
	const tracksStore = tx.objectStore('tracks')
	const store = tx.objectStore('playHistory')

	// Don't add orphaned history records for tracks that are no longer in library.
	const trackExists = (await tracksStore.count(trackId)) > 0
	if (!trackExists) {
		await tx.done
		return
	}

	const newEntry: Omit<PlayHistoryEntry, 'id'> = {
		trackId,
		playedAt: Date.now(),
	}

	const existingKey = await store.index('trackId').getKey(trackId)
	if (existingKey === undefined) {
		await store.add(newEntry as PlayHistoryEntry)
	} else {
		await store.put({
			...newEntry,
			id: existingKey,
		})
	}

	// Keep only the most recent PLAY_HISTORY_LIMIT entries.
	// Start at newest and jump over the records we keep, then delete the tail.
	let cursor = await store.index('playedAt').openCursor(null, 'prev')
	if (cursor !== null) {
		cursor = await cursor.advance(PLAY_HISTORY_LIMIT)
	}

	while (cursor !== null) {
		await cursor.delete()
		cursor = await cursor.continue()
	}

	await tx.done

	notifyPlayHistoryChange()
}

export const dbRemoveFromPlayHistory = async (trackId: number): Promise<void> => {
	const db = await getDatabase()
	const tx = db.transaction('playHistory', 'readwrite')
	const store = tx.objectStore('playHistory')

	const historyIds = await store.index('trackId').getAllKeys(trackId)
	await Promise.all(historyIds.map((id) => store.delete(id)))
	await tx.done

	notifyPlayHistoryChange()
}

export const dbClearPlayHistory = async (): Promise<void> => {
	const db = await getDatabase()
	await db.clear('playHistory')

	notifyPlayHistoryChange()
}

export const clearPlayHistory = createUIAction(false, dbClearPlayHistory)
