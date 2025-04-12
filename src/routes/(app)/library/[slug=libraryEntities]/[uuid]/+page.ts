import { goto } from '$app/navigation'
import { type DbValue, getDatabase } from '$lib/db/database.ts'
import {
	createPageQuery,
	type PageQueryResult,
} from '$lib/db/query/page-query.svelte.ts'
import { keysListDatabaseChangeHandler } from '$lib/library/get/ids-queries.ts'
import { getLibraryItemValue, LibraryItemNotFoundError } from '$lib/library/get/value.ts'
import { FAVORITE_PLAYLIST_ID, FAVORITE_PLAYLIST_UUID, type LibraryItemStoreName } from '$lib/library/types.ts'
import { error, redirect } from '@sveltejs/kit'
import type { PageLoad } from './$types.d.ts'

type DetailsSlug = Exclude<LibraryItemStoreName, 'tracks'>

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
		fetcher: () => getLibraryItemValue(storeName, id),
		onDatabaseChange: (changes, actions) => {
			for (const change of changes) {
				if (change.storeName === storeName && change.key === id) {
					// It is fine to refetch because value almost always will be in cache
					actions.refetch()
				}
			}
		},
		onError: (error) => {
			if (error instanceof LibraryItemNotFoundError) {
				void goto(`/library/${storeName}`, { replaceState: true })
			}
		},
	})

	return query
}

const createTracksPageQuery = <Slug extends DetailsSlug>(
	storeName: Slug,
	itemName: () => string,
	id: number,
): Promise<PageQueryResult<number[]>> => {
	const query = createPageQuery({
		key: () => [storeName, itemName()],
		fetcher: async ([, name]) => {
			const db = await getDatabase()

			let keys: number[]
			if (storeName === 'playlists') {
				const keysResult = await db.getAllKeysFromIndex('playlistsTracks', 'playlistId', id)
				keys = keysResult.map(([, trackId]) => trackId)
			} else {
				const index = configMap[storeName as Exclude<Slug, 'playlists'>].index
				keys = await db.getAllKeysFromIndex('tracks', index, name)
			}

			return keys
		},
		onDatabaseChange: (changes, actions) => {
			if (storeName !== 'playlists') {
				return keysListDatabaseChangeHandler('tracks', changes, actions)
			}

			for (const change of changes) {
				if (change.storeName === 'playlistsTracks') {
					const [playlistId, trackId] = change.key

					if (playlistId === id) {
						if (change.operation === 'delete') {
							actions.mutate((keys = []) => keys.filter((key) => key !== trackId))
						} else if (change.operation === 'add') {
							// We can't know the order
							actions.refetch()
						}
					}
				}
			}
		},
	})

	return query
}

interface LoadResult {
	slug: DetailsSlug
	libraryType: DetailsSlug
	itemQuery: PageQueryResult<DbValue<DetailsSlug>>
	tracksQuery: PageQueryResult<number[]>
}

export const load: PageLoad = async (event): Promise<LoadResult> => {
	const { slug } = event.params
	if (slug === 'tracks') {
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
	const tracksQuery = await createTracksPageQuery(slug, () => itemQuery.value.name, id)

	return {
		slug,
		libraryType: slug,
		itemQuery,
		tracksQuery,
	}
}
