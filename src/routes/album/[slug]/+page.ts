import { defineListQuery, defineQuery } from '$lib/db/db-fast.svelte'
import { getDB, getValue } from '$lib/db/get-db'
import { error } from '@sveltejs/kit'
import type { PageLoad } from './$types'

export const load: PageLoad = async (event) => {
	const id = Number(event.params.slug)

	const albumQuery = defineQuery({
		key: () => ['albums'],
		fetcher: async () => getValue('albums', id),
		// onDatabaseChange: (changes, { mutate, refetch }) => {

		// },
	})

	const album = await albumQuery.createPreloaded()
	const albumValue = album.preloadedValue

	if (!albumValue) {
		error(404, 'Not found')
	}

	const tracksQuery = defineListQuery(() => 'albums', {
		key: () => ['albums-tracks-list', albumValue.name],
		fetcher: async ([, name]) => {
			const db = await getDB()
			const keys = await db.getAllKeysFromIndex('tracks', 'album', name)

			return keys
		},
	})

	return {
		title: 'Album',
		albumQuery: album,
		tracksQuery: await tracksQuery.createPreloaded(),
		// pageTitle: `Album - ${store.title}`,
	}
}
