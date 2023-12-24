import type { Track } from '$lib/db/entities'
import { type AppStoreNames, getDB } from '$lib/db/get-db'
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

// TODO. Narrow down the type
export type TrackState =
	| {
			track: Track
			loading: false
	  }
	| {
			track: undefined
			loading: true
	  }

export const useTrack = (id: number) => {
	const cachedTrack = tracksCache.getValue(id)

	const state = $state<TrackState>({
		track: cachedTrack,
		loading: cachedTrack === undefined,
	} as TrackState)

	if (state.loading) {
		getTrack(id).then((t) => {
			state.loading = false
			state.track = t

			console.log('Track loaded', t)
		})
	}

	return state
}

export const getTracksIds = async () => {
	const db = await getDB()

	return db.getAllKeys('tracks')
}
