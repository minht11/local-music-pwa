import { defineListQuery, definePageQuery } from '$lib/db/db-fast.svelte'
import { getDB, getValue } from '$lib/db/get-db'
import { error } from '@sveltejs/kit'
import invariant from 'tiny-invariant'
import type { PageLoad } from './$types'

export const load: PageLoad = async (event) => {
	const id = Number(event.params.slug)

	const albumQuery = definePageQuery({
		key: () => ['albums', id],
		fetcher: async ([, albumId]) => {
			const album = await getValue('albums', albumId)

			invariant(album, 'Album not found')

			return album
		},
		// onDatabaseChange: (changes, { mutate, refetch }) => {

		// },
	})

	const album = await albumQuery.preload()

	if (!album) {
		error(404, 'Not found')
	}

	const tracksQuery = defineListQuery(() => 'albums', {
		key: () => ['albums-tracks-list', album.name],
		fetcher: async ([, name]) => {
			const db = await getDB()
			const keys = await db.getAllKeysFromIndex('tracks', 'album', name)

			return keys
		},
	})

	await tracksQuery.preload()

	return {
		title: 'Album',
		albumQuery,
		tracksQuery,
		// pageTitle: `Album - ${store.title}`,
	}
}
