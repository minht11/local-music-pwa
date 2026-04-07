import { goto } from '$app/navigation'
import { page } from '$app/state'
import { snackbar } from '$lib/components/snackbar/snackbar.ts'
import { dbGetAlbumTracksIdsByName, getLibraryItemIdFromUuid } from '$lib/library/get/ids.ts'
import { getLibraryValue } from '$lib/library/get/value.ts'
import type { PlayerStore } from '$lib/stores/player/player.svelte.ts'

const BOOKMARK_TRACK_PARAM = 'bookmarkTrack'
const BOOKMARK_TIME_PARAM = 'bookmarkTime'

export const buildBookmarkShareUrl = (trackUuid: string, timestampSeconds: number): string => {
	const url = new URL('/player', window.location.origin)
	url.searchParams.set(BOOKMARK_TRACK_PARAM, trackUuid)
	url.searchParams.set(BOOKMARK_TIME_PARAM, String(Math.max(0, Math.floor(timestampSeconds))))
	return url.toString()
}

export const shareBookmark = async (input: {
	trackName: string
	trackUuid: string
	timestampSeconds: number
}): Promise<void> => {
	const url = buildBookmarkShareUrl(input.trackUuid, input.timestampSeconds)

	try {
		if (navigator.share) {
			await navigator.share({
				title: input.trackName,
				text: `${input.trackName} at ${input.timestampSeconds}s`,
				url,
			})
			return
		}

		await navigator.clipboard.writeText(url)
		snackbar('Bookmark link copied')
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') {
			return
		}

		snackbar.unexpectedError(error)
	}
}

export const restoreSharedBookmarkFromUrl = async (player: PlayerStore): Promise<boolean> => {
	const trackUuid = page.url.searchParams.get(BOOKMARK_TRACK_PARAM)?.trim()
	const rawTimestamp = page.url.searchParams.get(BOOKMARK_TIME_PARAM)?.trim()
	if (!trackUuid || !rawTimestamp) {
		return false
	}

	const timestampSeconds = Number(rawTimestamp)
	if (!Number.isFinite(timestampSeconds) || timestampSeconds < 0) {
		return false
	}

	const trackId = await getLibraryItemIdFromUuid('tracks', trackUuid)
	if (!trackId) {
		return false
	}

	const track = await getLibraryValue('tracks', trackId, true)
	if (!track) {
		return false
	}

	const albumTrackIds = await dbGetAlbumTracksIdsByName(track.album)
	if (albumTrackIds.length > 0) {
		const startIndex = albumTrackIds.indexOf(track.id)
		if (startIndex >= 0) {
			player.playTrack(startIndex, albumTrackIds, { startTimeSeconds: timestampSeconds })
		} else {
			player.playTrack(0, [track.id], { startTimeSeconds: timestampSeconds })
		}
	} else {
		player.playTrack(0, [track.id], { startTimeSeconds: timestampSeconds })
	}

	const nextUrl = new URL(page.url)
	nextUrl.searchParams.delete(BOOKMARK_TRACK_PARAM)
	nextUrl.searchParams.delete(BOOKMARK_TIME_PARAM)
	await goto(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`, {
		replaceState: true,
		noScroll: true,
		keepFocus: true,
	})

	return true
}
