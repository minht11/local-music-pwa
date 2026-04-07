import { createQuery, type QueryResult } from '$lib/db/query/query.ts'
import { type BookmarkRecord, getDatabase } from '$lib/db/database.ts'
import { dispatchDatabaseChangedEvent } from '$lib/db/events.ts'
import { formatDuration } from '$lib/helpers/utils/format-duration.ts'
import { getLibraryValue, type TrackData } from '$lib/library/get/value.ts'
import type { PlayerStore } from '$lib/stores/player/player.svelte.ts'
import { dbGetAlbumTracksIdsByName } from '$lib/library/get/ids.ts'

export interface BookmarkWithTrack extends BookmarkRecord {
	track: TrackData
}

export interface BookmarkDialogState {
	bookmarkId: number
}

const getBookmarkSearchText = (bookmark: BookmarkWithTrack): string =>
	[
		bookmark.track.name,
		bookmark.track.album,
		bookmark.note ?? '',
		formatBookmarkTimestamp(bookmark.timestampSeconds),
	]
		.join(' ')
		.toLowerCase()

const bookmarkMatchesSearch = (bookmark: BookmarkWithTrack, searchTerm: string): boolean =>
	getBookmarkSearchText(bookmark).includes(searchTerm)

const withTrack = async (bookmark: BookmarkRecord): Promise<BookmarkWithTrack | null> => {
	const track = await getLibraryValue('tracks', bookmark.trackId, true)
	if (!track) {
		return null
	}

	return {
		...bookmark,
		track,
	}
}

export const getBookmark = async (bookmarkId: number): Promise<BookmarkRecord | undefined> => {
	const db = await getDatabase()
	return db.get('bookmarks', bookmarkId)
}

export const getBookmarkWithTrack = async (
	bookmarkId: number,
): Promise<BookmarkWithTrack | undefined> => {
	const bookmark = await getBookmark(bookmarkId)
	if (!bookmark) {
		return undefined
	}

	return (await withTrack(bookmark)) ?? undefined
}

export const getBookmarks = async (searchTerm = ''): Promise<BookmarkWithTrack[]> => {
	const db = await getDatabase()
	const bookmarks = await db.getAllFromIndex('bookmarks', 'updatedAt')
	const normalizedSearchTerm = searchTerm.trim().toLowerCase()
	const resolved = await Promise.all(bookmarks.toReversed().map(withTrack))

	return resolved.filter((bookmark): bookmark is BookmarkWithTrack => {
		if (!bookmark) {
			return false
		}

		if (!normalizedSearchTerm) {
			return true
		}

		return bookmarkMatchesSearch(bookmark, normalizedSearchTerm)
	})
}

export const getRecentBookmarks = async (limit: number): Promise<BookmarkWithTrack[]> => {
	const bookmarks = await getBookmarks()
	return bookmarks.slice(0, limit)
}

export const createBookmark = async (input: {
	trackId: number
	timestampSeconds: number
	note?: string
}): Promise<number> => {
	const db = await getDatabase()
	const now = Date.now()
	const bookmark: Omit<BookmarkRecord, 'id'> = {
		trackId: input.trackId,
		timestampSeconds: Math.max(0, Math.floor(input.timestampSeconds)),
		note: input.note?.trim() || undefined,
		createdAt: now,
		updatedAt: now,
	}

	const bookmarkId = await db.add('bookmarks', bookmark as BookmarkRecord)
	dispatchDatabaseChangedEvent({
		operation: 'add',
		storeName: 'bookmarks',
		key: bookmarkId,
	})

	return bookmarkId
}

export const updateBookmark = async (input: {
	id: number
	note?: string
}): Promise<void> => {
	const db = await getDatabase()
	const existing = await db.get('bookmarks', input.id)
	invariant(existing, 'Bookmark not found')

	await db.put('bookmarks', {
		...existing,
		note: input.note?.trim() || undefined,
		updatedAt: Date.now(),
	})

	dispatchDatabaseChangedEvent({
		operation: 'update',
		storeName: 'bookmarks',
		key: input.id,
	})
}

export const deleteBookmark = async (bookmarkId: number): Promise<void> => {
	const db = await getDatabase()
	await db.delete('bookmarks', bookmarkId)

	dispatchDatabaseChangedEvent({
		operation: 'delete',
		storeName: 'bookmarks',
		key: bookmarkId,
	})
}

const shouldRefetchBookmarks = (changes: readonly { storeName: string }[]): boolean =>
	changes.some((change) => change.storeName === 'bookmarks' || change.storeName === 'tracks')

export const createBookmarksQuery = (
	searchTermGetter: () => string,
): QueryResult<BookmarkWithTrack[]> =>
	createQuery({
		key: () => [searchTermGetter()],
		fetcher: ([searchTerm]) => getBookmarks(searchTerm),
		onDatabaseChange: (changes, { refetch }) => {
			if (shouldRefetchBookmarks(changes)) {
				void refetch()
			}
		},
	})

export const createRecentBookmarksQuery = (limit: number): QueryResult<BookmarkWithTrack[]> =>
	createQuery({
		key: () => [limit],
		fetcher: ([bookmarkLimit]) => getRecentBookmarks(bookmarkLimit),
		onDatabaseChange: (changes, { refetch }) => {
			if (shouldRefetchBookmarks(changes)) {
				void refetch()
			}
		},
	})

export const createBookmarkQuery = (
	bookmarkIdGetter: () => number,
): QueryResult<BookmarkWithTrack | undefined> =>
	createQuery({
		key: bookmarkIdGetter,
		fetcher: getBookmarkWithTrack,
		onDatabaseChange: (changes, { refetch }) => {
			if (shouldRefetchBookmarks(changes)) {
				void refetch()
			}
		},
	})

export const formatBookmarkTimestamp = (timestampSeconds: number): string =>
	formatDuration(Math.max(0, Math.floor(timestampSeconds)))

export const playBookmark = async (
	player: PlayerStore,
	bookmark: Pick<BookmarkWithTrack, 'track' | 'timestampSeconds'>,
): Promise<void> => {
	const albumTrackIds = await dbGetAlbumTracksIdsByName(bookmark.track.album)
	if (albumTrackIds.length > 0) {
		const startIndex = albumTrackIds.indexOf(bookmark.track.id)
		if (startIndex >= 0) {
			player.playTrack(startIndex, albumTrackIds, {
				startTimeSeconds: bookmark.timestampSeconds,
			})
			return
		}
	}

	player.playTrack(0, [bookmark.track.id], {
		startTimeSeconds: bookmark.timestampSeconds,
	})
}
