import { goto } from '$app/navigation'
import { type DbValue, getDatabase } from '$lib/db/database.ts'
import { getEntityData, NoEntityFoundError } from '$lib/db/entity.ts'
import { keysListDatabaseChangeHandler } from '$lib/db/query/helpers.ts'
import {
	createPageQuery,
	type PageQueryResult,
} from '$lib/db/query/page-query.svelte.ts'
import type { LibraryEntityStoreName } from '$lib/library/general.ts'
import { error, redirect } from '@sveltejs/kit'
import type { PageLoad } from './$types.d.ts'

type DetailsSlug = Exclude<LibraryEntityStoreName, 'tracks'>

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
): PageQueryResult<DbValue<T>> => {
	const query = createPageQuery({
		key: () => [storeName, id],
		fetcher: () => getEntityData(storeName, id),
		onDatabaseChange: (changes, actions) => {
			for (const change of changes) {
				if (change.storeName === storeName && change.key === id) {
					if (change.operation === 'delete') {
						goto(`/library/${storeName}`)

						break
					}

					// It is fine to refetch because value almost always will be in cache
					actions.refetch()
				}
			}
		},
		onError: (error) => {
			if (error instanceof NoEntityFoundError) {
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
): PageQueryResult<number[]> => {
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
				return keysListDatabaseChangeHandler(storeName, changes, actions)
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

	const id = Number(event.params.id)
	if (!Number.isFinite(id)) {
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
