import { notifyAboutDatabaseChanges } from '$lib/db/channel'
import { createQuery, deleteCacheValue } from '$lib/db/db-fast.svelte'
import type { Track } from '$lib/db/entities'
import { getDB, getValue } from '$lib/db/get-db'
import invariant from 'tiny-invariant'

const trackCacheKey = 'track'
const trackCacheIdKey = (id: number) => [trackCacheKey, id] as const

export const removeTrack = async (id: number) => {
	const db = await getDB()

	deleteCacheValue(trackCacheIdKey(id))

	await db.delete('tracks', id)

	notifyAboutDatabaseChanges([
		{
			storeName: 'tracks',
			operation: 'delete',
			id,
		},
	])
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
	createQuery({
		key: () => trackCacheIdKey(typeof id === 'function' ? id() : id),
		fetcher: async ([, id]) => {
			const track = await getValue('tracks', id)

			if (options.allowEmpty) {
				return track as Track
			}

			invariant(track, `Track with id ${id} not found`)

			return track
		},
	})
