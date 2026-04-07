import { dbGetAlbumTracksIdsByName } from '$lib/library/get/ids.ts'
import { getLibraryValue } from '$lib/library/get/value.ts'
import type { PlayerStore } from '$lib/stores/player/player.svelte.ts'

interface BookmarkPlaybackTarget {
	trackId: number
	timestampSeconds: number
}

const resolveBookmarkQueue = async (
	trackId: number,
): Promise<{ queue: number[]; startIndex: number } | null> => {
	const track = await getLibraryValue('tracks', trackId, true)
	if (!track) {
		return null
	}

	const albumTrackIds = await dbGetAlbumTracksIdsByName(track.album)
	const queue = albumTrackIds.length > 0 ? albumTrackIds : [trackId]
	const startIndex = Math.max(0, queue.indexOf(trackId))

	return {
		queue,
		startIndex,
	}
}

export const playBookmark = async (
	player: PlayerStore,
	bookmark: BookmarkPlaybackTarget,
	autoplay = true,
): Promise<boolean> => {
	const target = await resolveBookmarkQueue(bookmark.trackId)
	if (!target) {
		return false
	}

	const options = {
		startTimeSeconds: Math.max(0, Math.floor(bookmark.timestampSeconds)),
		sourceContext: 'library' as const,
	}

	if (autoplay) {
		player.playTrack(target.startIndex, target.queue, options)
	} else {
		player.prepareTrack(target.startIndex, target.queue, options)
	}

	return true
}

export const restoreSharedBookmark = async (
	player: PlayerStore,
	url: URL,
): Promise<{ handled: boolean; bookmark: BookmarkPlaybackTarget | null }> => {
	const trackIdRaw = url.searchParams.get('trackId')?.trim()
	const timestampRaw = url.searchParams.get('timestamp')?.trim()
	const trackId = trackIdRaw ? Number(trackIdRaw) : Number.NaN
	const timestampSeconds = timestampRaw ? Number(timestampRaw) : Number.NaN

	if (!Number.isInteger(trackId) || !Number.isFinite(timestampSeconds)) {
		return { handled: false, bookmark: null }
	}

	const bookmark = {
		trackId,
		timestampSeconds: Math.max(0, Math.floor(timestampSeconds)),
	}
	const handled = await playBookmark(player, bookmark, true)

	return {
		handled,
		bookmark,
	}
}
