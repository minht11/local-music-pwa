import { snackbar } from '$lib/components/snackbar/snackbar.ts'
import { formatBookmarkTimestamp } from './format.ts'
import type { ResolvedBookmark } from './types.ts'

const getBookmarkShareUrl = (bookmark: Pick<ResolvedBookmark, 'trackId' | 'timestampSeconds'>): string => {
	const url = new URL('/library/bookmarks', window.location.origin)
	url.searchParams.set('trackId', String(bookmark.trackId))
	url.searchParams.set('timestamp', String(Math.max(0, Math.floor(bookmark.timestampSeconds))))
	return url.toString()
}

export const shareBookmark = async (bookmark: ResolvedBookmark): Promise<void> => {
	const shareUrl = getBookmarkShareUrl(bookmark)
	const shareData = {
		title: bookmark.discourseName,
		text: `${bookmark.trackName} • ${formatBookmarkTimestamp(bookmark.timestampSeconds)}`,
		url: shareUrl,
	}

	if (navigator.share) {
		try {
			await navigator.share(shareData)
			return
		} catch (error) {
			if ((error as Error).name === 'AbortError') {
				return
			}
		}
	}

	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(shareUrl)
		snackbar('Bookmark link copied')
	}
}
