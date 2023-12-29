import type { Track } from '$lib/db/entities'
import { type AppStoreNames, getDB } from '$lib/db/get-db'
import { useDbQuery } from '$lib/helpers/use-db-query.svelte'
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

	return track
}

export const deleteTrack = async (id: number) => {
	const db = await getDB()

	tracksCache.delete(id)

	return db.delete('tracks', id)
}

export interface UseTrackOptions<AllowEmpty extends boolean = false> {
	allowEmpty?: AllowEmpty
}

export type UseTrackResult<AllowEmpty extends boolean = false> = AllowEmpty extends true
	? Track | undefined
	: Track

export const useTrack = <AllowEmpty extends boolean = false>(
	id: number | (() => number),
	options: UseTrackOptions<AllowEmpty> = {},
) =>
	useDbQuery({
		key: () => (typeof id === 'function' ? id() : id),
		fetcher: async (key): Promise<UseTrackResult<AllowEmpty>> => {
			const track = await getTrack(key)

			if (options.allowEmpty) {
				return track as Track
			}

			invariant(track, `Track with id ${key} not found`)

			return track
		},
		cache: tracksCache,
		onDatabaseChange: () => {},
	})
