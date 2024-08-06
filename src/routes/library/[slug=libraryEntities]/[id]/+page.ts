import { goto } from '$app/navigation'
import { type DbValue, getDB } from '$lib/db/get-db.ts'
import {
	type PageLoaderResult,
	definePageListLoader,
	definePageLoader,
} from '$lib/db/queries.svelte.ts'
import type { LibraryEntityStoreName } from '$lib/library/general.ts'
import { error } from '@sveltejs/kit'
import invariant from 'tiny-invariant'
import type { PageLoad } from './$types.ts'

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

const defineDetailsLoader = <T extends DetailsSlug>(
	storeName: T,
	id: number,
): PageLoaderResult<DbValue<T>, undefined> => {
	const query = definePageLoader({
		key: () => [storeName, id],
		fetcher: async () => {
			const db = await getDB()
			const item = await db.get(storeName, id)

			// TODO. Return proper error message
			invariant(item, 'Item not found')

			return item
		},
		onDatabaseChange: (changes, actions) => {
			for (const change of changes) {
				if (change.storeName === storeName && change.key === id) {
					if (change.operation === 'delete') {
						goto(`/library/${storeName}`)

						break
					}

					actions.mutate(change.value)
				}
			}
		},
		onError: (error) => {
			// TODO.
			goto(`/library/${storeName}`)
		},
	})

	return query
}

const defineTracksLoader = <Slug extends DetailsSlug>(
	storeName: Slug,
	itemName: () => string,
	id: number,
): PageLoaderResult<number[], undefined> => {
	const query = definePageListLoader('tracks', {
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
		// TODO.
		// onDatabaseChange: (changes, { mutate }) => {
	})

	return query
}

export const load: PageLoad = async (event) => {
	const { slug } = event.params

	if (slug === 'tracks') {
		error(404)
	}

	const id = Number(event.params.id)

	if (!Number.isFinite(id)) {
		error(404)
	}

	const itemLoader = await defineDetailsLoader(slug, id)
	const tracksLoader = await defineTracksLoader(slug, () => itemLoader.value.name, id)

	await preloadTracksToDatabaseCache(tracksLoader.value, 10)

	return {
		slug,
		libraryType: slug,
		title: 'Album',
		itemLoader,
		tracksLoader,
	}
}
