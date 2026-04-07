import type { DBSchema } from 'idb'
import { openDB } from 'idb'
import { snackbar } from '$lib/components/snackbar/snackbar.ts'
import { getLibraryValue } from '$lib/library/get/value.ts'
import invariant from 'tiny-invariant'
import type { BookmarkRecord, ResolvedBookmark } from './types.ts'

const BOOKMARK_DB_NAME = 'rajneesh-bookmarks'
const BOOKMARK_DB_VERSION = 1
const BOOKMARKS_STORE = 'bookmarks'

interface BookmarkDB extends DBSchema {
	bookmarks: {
		key: number
		value: BookmarkRecord
		indexes: {
			trackId: number
			updatedAt: number
			createdAt: number
		}
	}
}

const listeners = new Set<() => void>()

const getDb = () =>
	openDB<BookmarkDB>(BOOKMARK_DB_NAME, BOOKMARK_DB_VERSION, {
		upgrade(db) {
			if (!db.objectStoreNames.contains(BOOKMARKS_STORE)) {
				const store = db.createObjectStore(BOOKMARKS_STORE, {
					keyPath: 'id',
					autoIncrement: true,
				})
				store.createIndex('trackId', 'trackId')
				store.createIndex('updatedAt', 'updatedAt')
				store.createIndex('createdAt', 'createdAt')
			}
		},
	})

const notifyListeners = () => {
	for (const listener of listeners) {
		listener()
	}
}

const normalizeTimestamp = (timestampSeconds: number): number =>
	Math.max(0, Math.floor(timestampSeconds))

const normalizeNote = (note: string | undefined): string | undefined => {
	const trimmed = note?.trim()
	return trimmed ? trimmed : undefined
}

export const createBookmark = async (
	trackId: number,
	timestampSeconds: number,
	note?: string,
): Promise<number> => {
	const db = await getDb()
	const now = Date.now()
	const bookmark: BookmarkRecord = {
		trackId,
		timestampSeconds: normalizeTimestamp(timestampSeconds),
		note: normalizeNote(note),
		createdAt: now,
		updatedAt: now,
	}
	const id = await db.add(BOOKMARKS_STORE, bookmark)

	notifyListeners()

	return id
}

export const getBookmark = async (bookmarkId: number): Promise<BookmarkRecord | undefined> => {
	const db = await getDb()
	return db.get(BOOKMARKS_STORE, bookmarkId)
}

export const updateBookmark = async (
	bookmarkId: number,
	updates: Partial<Pick<BookmarkRecord, 'note' | 'timestampSeconds'>>,
): Promise<boolean> => {
	try {
		const db = await getDb()
		const tx = db.transaction(BOOKMARKS_STORE, 'readwrite')
		const existing = await tx.store.get(bookmarkId)
		invariant(existing, 'Bookmark not found')

		const nextBookmark: BookmarkRecord = {
			...existing,
			note:
				updates.note !== undefined ? normalizeNote(updates.note) : normalizeNote(existing.note),
			timestampSeconds:
				updates.timestampSeconds !== undefined
					? normalizeTimestamp(updates.timestampSeconds)
					: normalizeTimestamp(existing.timestampSeconds),
			updatedAt: Date.now(),
		}

		await tx.store.put(nextBookmark)
		await tx.done
		notifyListeners()

		return true
	} catch (error) {
		snackbar.unexpectedError(error)
		return false
	}
}

export const deleteBookmark = async (bookmarkId: number): Promise<boolean> => {
	try {
		const db = await getDb()
		await db.delete(BOOKMARKS_STORE, bookmarkId)
		notifyListeners()

		return true
	} catch (error) {
		snackbar.unexpectedError(error)
		return false
	}
}

export const getAllBookmarks = async (): Promise<BookmarkRecord[]> => {
	const db = await getDb()
	const bookmarks = await db.getAllFromIndex(BOOKMARKS_STORE, 'updatedAt')

	return bookmarks
		.slice()
		.reverse()
		.map((bookmark) => ({
			...bookmark,
			id: bookmark.id,
			note: normalizeNote(bookmark.note),
		}))
}

export const getResolvedBookmarks = async (searchTerm = ''): Promise<ResolvedBookmark[]> => {
	const normalizedSearch = searchTerm.trim().toLowerCase()
	const bookmarks = await getAllBookmarks()

	const resolvedBookmarks = await Promise.all(
		bookmarks.map(async (bookmark) => {
			if (bookmark.id === undefined) {
				return null
			}

			const track = await getLibraryValue('tracks', bookmark.trackId, true)
			if (!track) {
				return null
			}

			const resolved: ResolvedBookmark = {
				id: bookmark.id,
				trackId: bookmark.trackId,
				timestampSeconds: normalizeTimestamp(bookmark.timestampSeconds),
				note: normalizeNote(bookmark.note),
				createdAt: bookmark.createdAt,
				updatedAt: bookmark.updatedAt,
				trackName: track.name,
				discourseName: track.album,
			}

			if (!normalizedSearch) {
				return resolved
			}

			const searchableText = [
				resolved.discourseName,
				resolved.trackName,
				resolved.note ?? '',
			]
				.join(' ')
				.toLowerCase()

			return searchableText.includes(normalizedSearch) ? resolved : null
		}),
	)

	return resolvedBookmarks.filter((bookmark): bookmark is ResolvedBookmark => !!bookmark)
}

export const onBookmarksDataChange = (handler: () => void): (() => void) => {
	listeners.add(handler)

	return () => {
		listeners.delete(handler)
	}
}
