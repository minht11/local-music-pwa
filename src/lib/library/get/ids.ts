import type { IDBPIndex } from 'idb'
import { type AppDB, type AppIndexNames, getDatabase } from '$lib/db/database.ts'
import type { LibraryStoreName } from '../types.ts'
import { isRajneeshEnabled } from '$lib/rajneesh/feature-flags.ts'
import {
	rajneeshGetLibraryItemIds,
	rajneeshGetAlbumTracksIdsByName,
	rajneeshGetArtistTracksIdsByName,
	rajneeshGetIdFromUuid,
} from '$lib/rajneesh/hooks/get-ids.ts'

export type SortOrder = 'asc' | 'desc'
export type LibraryItemSortKey<Store extends LibraryStoreName> = Exclude<
	AppIndexNames<Store>,
	symbol
>

export interface SortOptions<Store extends LibraryStoreName> {
	sort: LibraryItemSortKey<Store>
	order?: SortOrder
	searchTerm?: string
	searchFn?: (value: AppDB[Store]['value'], term: string) => boolean
}

type GetLibraryItemIdsIndex<Store extends LibraryStoreName> = IDBPIndex<
	AppDB,
	[Store],
	Store,
	keyof AppDB[Store]['indexes'] & string
>

const getLibraryItemIdsWithSearchSlow = async <Store extends LibraryStoreName>(
	storeIndex: GetLibraryItemIdsIndex<Store>,
	searchTerm: string,
	searchFn: (value: AppDB[Store]['value'], term: string) => boolean,
) => {
	const data: number[] = []

	for await (const cursor of storeIndex.iterate()) {
		if (searchFn(cursor.value, searchTerm)) {
			data.push(cursor.primaryKey)
		}
	}

	return data
}

export const getLibraryItemIds = async <Store extends LibraryStoreName>(
	store: Store,
	options: SortOptions<Store>,
): Promise<number[]> => {
	// RAJNEESH HOOK
	if (isRajneeshEnabled() && store !== 'playlists' && store !== 'bookmarks') {
		return rajneeshGetLibraryItemIds(store, options)
	}

	const db = await getDatabase()
	const storeIndex = db.transaction(store).store.index(options.sort)

	const { searchTerm, searchFn } = options

	let data: number[]
	if (searchTerm && searchFn) {
		data = await getLibraryItemIdsWithSearchSlow(storeIndex, searchTerm, searchFn)
	} else {
		// Fast path
		data = await db.getAllKeysFromIndex(store, options.sort)
	}

	if (options.order === 'desc') {
		data.reverse()
	}

	return data
}

export const dbGetAlbumTracksIdsByName = async (albumName: string): Promise<number[]> => {
	// RAJNEESH HOOK
	if (isRajneeshEnabled()) {
		return rajneeshGetAlbumTracksIdsByName(albumName)
	}

	const db = await getDatabase()
	const tracksIds = await db.getAllKeysFromIndex(
		'tracks',
		'byAlbumSorted',
		IDBKeyRange.bound([albumName], [albumName, '\uffff']),
	)

	return tracksIds
}

export const dbGetArtistTracksIdsByName = async (artistName: string): Promise<number[]> => {
	// RAJNEESH HOOK
	if (isRajneeshEnabled()) {
		return rajneeshGetArtistTracksIdsByName(artistName)
	}

	const db = await getDatabase()
	const tracksIds = await db.getAllKeysFromIndex(
		'tracks',
		'artists',
		IDBKeyRange.only(artistName),
	)

	return tracksIds
}

export const getLibraryItemIdFromUuid = async (
	storeName: LibraryStoreName,
	uuid: string,
): Promise<number | undefined> => {
	// RAJNEESH HOOK
	if (isRajneeshEnabled() && storeName !== 'playlists' && storeName !== 'bookmarks') {
		return rajneeshGetIdFromUuid(storeName, uuid)
	}

	const db = await getDatabase()
	// @ts-expect-error - we know UUID index exists for all stores we query
	return db.getKeyFromIndex(storeName, 'uuid', uuid)
}
