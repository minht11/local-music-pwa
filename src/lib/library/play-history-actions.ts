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

	const track = await tracksStore.get(trackId)
	if (!track) {
		await tx.done
		return
	}

	// Keep one entry per track in history by replacing any previous occurrences.
	const existingIds = await store.index('trackId').getAllKeys(trackId)
	await Promise.all(existingIds.map((id) => store.delete(id)))

	const newEntry: Omit<PlayHistoryEntry, 'id'> = {
		trackId,
		playedAt: Date.now(),
	}

	await store.add(newEntry as PlayHistoryEntry)

	// Keep only the most recent PLAY_HISTORY_LIMIT entries.
	// 'prev' opens in descending order (newest first), so advance(limit) lands on
	// the oldest entry that exceeds the cap, and everything from there is deleted.
	let cursor = await store.index('playedAt').openCursor(null, 'prev')
	cursor = (await cursor?.advance(PLAY_HISTORY_LIMIT)) ?? null

	// Delete all entries that exceed the limit
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
