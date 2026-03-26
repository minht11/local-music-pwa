import type { ActiveMinute } from './database.ts'
import { getDatabase } from './database.ts'
import { dispatchDatabaseChangedEvent } from './events.ts'

export type ActiveMinuteDraft = ActiveMinute

const getMinuteKeyRangeForTrack = (trackId: string) =>
	IDBKeyRange.bound([trackId, 0], [trackId, Number.MAX_SAFE_INTEGER])

export const addActiveMinute = async (minute: ActiveMinuteDraft): Promise<ActiveMinute> => {
	const db = await getDatabase()
	const cleanMinute: ActiveMinuteDraft = {
		activeMinuteTimestampMs: minute.activeMinuteTimestampMs,
		trackId: minute.trackId,
		trackTimestampMs: minute.trackTimestampMs,
		playbackRate: minute.playbackRate,
	}
	await db.put('activeMinutes', cleanMinute as ActiveMinute)
	const value: ActiveMinute = { ...cleanMinute }

	dispatchDatabaseChangedEvent({
		operation: 'add',
		storeName: 'activeMinutes',
		key: cleanMinute.activeMinuteTimestampMs,
	})

	return value
}

export const getLatestActiveMinuteForTrack = async (
	trackId: string,
): Promise<ActiveMinute | undefined> => {
	const db = await getDatabase()
	const tx = db.transaction('activeMinutes')
	const index = tx.store.index('trackIdActiveMinuteTimestampMs')
	const cursor = await index.openCursor(getMinuteKeyRangeForTrack(trackId), 'prev')

	return cursor?.value
}

export const getLatestActiveMinutesByTrack = async (): Promise<Map<string, ActiveMinute>> => {
	const db = await getDatabase()
	const minutes = await db.getAll('activeMinutes')
	const latestByTrack = new Map<string, ActiveMinute>()

	for (const minute of minutes) {
		const existing = latestByTrack.get(minute.trackId)
		if (!existing || minute.activeMinuteTimestampMs > existing.activeMinuteTimestampMs) {
			latestByTrack.set(minute.trackId, minute)
		}
	}

	return latestByTrack
}

export const clearActiveMinutesForTrack = async (trackId: string): Promise<void> => {
	const db = await getDatabase()
	const tx = db.transaction('activeMinutes', 'readwrite')
	const index = tx.store.index('trackId')
	const changes = []

	for await (const cursor of index.iterate(trackId)) {
		const key = cursor.primaryKey as number
		await cursor.delete()
		changes.push({
			operation: 'delete',
			storeName: 'activeMinutes',
			key,
		})
	}

	await tx.done

	if (changes.length > 0) {
		dispatchDatabaseChangedEvent(changes)
	}
}
