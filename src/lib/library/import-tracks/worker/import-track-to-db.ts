import type { Track, UnknownTrack } from '$lib/db/entities'
import { getDB } from '$lib/db/get-db'

export const importTrackToDb = async (metadata: UnknownTrack) => {
	const db = await getDB()

	// TODO. Check if track already exists.

	await db.add('tracks', metadata as Track)
}
