import { goto } from '$app/navigation'
import { getEntityData } from '$lib/db/entity.ts'
import { type DbValue, getDB } from '$lib/db/get-db.ts'
import {
	type PageQueryResult,
	createPageQuery,
	keysListDatabaseChangeHandler,
} from '$lib/db/query.svelte.ts'
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

class DbItemNotFound extends Error {
	constructor() {
		super('DbItemNotFound')
	}
}

const createDetailsPageQuery = <T extends DetailsSlug>(
	storeName: T,
	id: number,
): PageQueryResult<DbValue<T>> => {
	const query = createPageQuery({
		key: () => [storeName, id],
		fetcher: async () => {
			const item = await getEntityData(storeName, id)

			if (!item) {
				throw new DbItemNotFound()
			}

			return item
		},
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
			if (error instanceof DbItemNotFound) {
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
			const db = await getDB()

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

export const load: PageLoad = async (event) => {
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
