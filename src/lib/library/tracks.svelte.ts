import type { Track } from '$lib/db/entities'
import { type AppStoreNames, getDB } from '$lib/db/get-db'
import { useDbQuery } from '$lib/helpers/use-db-query.svelte'
import { assign } from '$lib/helpers/utils'
import { untrack } from 'svelte'
import invariant from 'tiny-invariant'
import { WeakLRUCache } from 'weak-lru-cache'

const getValueById = async <Names extends AppStoreNames>(storeName: Names, id: number) => {
	const db = await getDB()

	return db.get(storeName, id)
}

const tracksCache = new WeakLRUCache<number, Track>({
	cacheSize: 10_000,
})

export const getTrack = async (id: number) => {
	const cachedValue = tracksCache.getValue(id)

	if (cachedValue !== undefined) {
		return cachedValue
	}

	const track = await getValueById('tracks', id)
	if (track !== undefined) {
		tracksCache.setValue(id, track)
	}

	// invariant(track, `Track with id ${id} not found`)

	return track
}

export const deleteTrack = async (id: number) => {
	const db = await getDB()

	tracksCache.delete(id)

	return db.delete('tracks', id)
}

export const useTrack = (id: number | (() => number)) =>
	useDbQuery({
		key: () => (typeof id === 'function' ? id() : id),
		fetcher: (key) => getTrack(key),
		cache: tracksCache,
		onDatabaseChange: () => {},
	})
