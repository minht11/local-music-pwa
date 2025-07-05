import { error, redirect } from '@sveltejs/kit'
import { goto } from '$app/navigation'
import { type DbValue, getDatabase } from '$lib/db/database.ts'
import { createPageQuery, type PageQueryResult } from '$lib/db/query/page-query.svelte.ts'
import { keysListDatabaseChangeHandler } from '$lib/library/get/ids-queries.ts'
import { getLibraryValue, LibraryValueNotFoundError } from '$lib/library/get/value.ts'
import {
	FAVORITE_PLAYLIST_ID,
	FAVORITE_PLAYLIST_UUID,
	type LibraryStoreName,
} from '$lib/library/types.ts'
import type { PageLoad } from './$types.d.ts'

type DetailsSlug = Exclude<LibraryStoreName, 'tracks'>

const configMap = {
	albums: {
		index: 'album',
	},
	artists: {
		index: 'artists',
	},
	playlists: {
		index: 'playlist',
	},
} as const

const createDetailsPageQuery = <T extends DetailsSlug>(
	storeName: T,
	id: number,
): Promise<PageQueryResult<DbValue<T>>> => {
	const query = createPageQuery({
		key: () => [storeName, id],
		fetcher: () => getLibraryValue(storeName, id),
		onDatabaseChange: (changes, actions) => {
			for (const change of changes) {
				if (change.storeName === storeName && change.key === id) {
					// We always refetch because in most cases we would just hit Library Value Cache
					actions.refetch()
					break
				}
			}
		},
		onError: (error) => {
			if (error instanceof LibraryValueNotFoundError) {
				void goto(`/library/${storeName}`, { replaceState: true })
			}
		},
	})

	return query
}

export interface TracksQueryRegularResult {
	tracksIds: number[]
	playlistIdMap: null
}

const createTracksPageQuery = <Slug extends Exclude<DetailsSlug, 'playlists'>>(
	storeName: Slug,
	itemName: () => string,
	id: number,
): Promise<PageQueryResult<TracksQueryRegularResult>> => {
	const query = createPageQuery({
		key: () => [storeName, itemName()],
		fetcher: async ([, name]): Promise<TracksQueryRegularResult> => {
			const db = await getDatabase()

			const index = configMap[storeName].index
			const keys = await db.getAllKeysFromIndex('tracks', index, name)

			return { tracksIds: keys, playlistIdMap: null }
		},
		onDatabaseChange: (changes, actions) => {
			return keysListDatabaseChangeHandler('tracks', changes, actions)
		},
	})

	return query
}

export interface PlaylistTrackItem {
	trackId: number
	uuid: string
}

export interface PlaylistTracksQueryResult {
	tracksIds: number[]
	playlistIdMap: Record<number, number>
}

const createPlaylistTracksPageQuery = (
	playlistId: number,
): Promise<PageQueryResult<PlaylistTracksQueryResult>> => {
	const query = createPageQuery({
		key: () => [playlistId],
		fetcher: async (): Promise<PlaylistTracksQueryResult> => {
			const db = await getDatabase()

			const values = await db.getAllFromIndex('playlistEntries', 'playlistId', playlistId)

			const tracksIds: number[] = Array.from({ length: values.length })
			const playlistIdMap: Record<number, number> = {}
			for (let i = 0; i < values.length; i++) {
				// biome-ignore lint/style/noNonNullAssertion: value is always defined
				const value = values[i]!
				tracksIds[i] = value.trackId
				playlistIdMap[value.trackId] = value.id
			}
			return { tracksIds, playlistIdMap }
		},
		onDatabaseChange: (changes, actions) => {
			// TODO.
			// for (const change of changes) {
			// 	if (change.storeName === 'playlistEntries') {
			// 		const [changePlaylistId, trackId] = change.key
			// 		if (changePlaylistId === playlistId) {
			// 			if (change.operation === 'delete') {
			// 				// TODO
			// 				// actions.mutate((keys = []) => keys.filter((key) => key !== trackId))
			// 			} else if (change.operation === 'add') {
			// 				// We can't know the order
			// 				actions.refetch()
			// 			}
			// 		}
			// 	}
			// }
		},
	})

	return query
}

interface LoadResult {
	slug: DetailsSlug
	libraryType: DetailsSlug
	itemQuery: PageQueryResult<DbValue<DetailsSlug>>
	tracksQuery: PageQueryResult<TracksQueryRegularResult | PlaylistTracksQueryResult>
}

export const load: PageLoad = async (event): Promise<LoadResult> => {
	const { slug } = event.params
	if (!slug || slug === 'tracks') {
		redirect(301, '/library/tracks')
	}

	const uuid = event.params.uuid
	if (!uuid) {
		error(404)
	}

	let id: number | undefined
	if (uuid === FAVORITE_PLAYLIST_UUID) {
		id = FAVORITE_PLAYLIST_ID
	} else {
		const db = await getDatabase()
		id = await db.getKeyFromIndex(slug, 'uuid', uuid)
	}

	if (!id) {
		error(404)
	}

	const itemQuery = await createDetailsPageQuery(slug, id)
	const tracksQuery = await (slug === 'playlists'
		? createPlaylistTracksPageQuery(id)
		: createTracksPageQuery(slug, () => itemQuery.value.name, id))

	return {
		slug,
		libraryType: slug,
		itemQuery,
		tracksQuery,
	}
}
