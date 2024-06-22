import { defineListQuery, definePageQuery } from '$lib/db/db-fast.svelte.ts'
import { getDB, getValue } from '$lib/db/get-db.ts'
import { preloadTracks } from '$lib/library/tracks.svelte.ts'
import { error } from '@sveltejs/kit'
import invariant from 'tiny-invariant'
import type { PageLoad } from './$types.ts'

export const load: PageLoad = async (event) => {
	const { slug } = event.params

	if (slug === 'tracks') {
		error(404)
	}

	const id = Number(event.params.id)

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
		error(404)
	}

	const tracksQuery = defineListQuery(() => 'albums', {
		key: () => ['albums-tracks-list', album.name],
		fetcher: async ([, name]) => {
			const db = await getDB()
			const keys = await db.getAllKeysFromIndex('tracks', 'album', name)

			return keys
		},
	})

	const trackIds = await tracksQuery.preload()
	await preloadTracks(trackIds, 10)

	return {
		libraryType: slug,
		title: 'Album',
		albumQuery,
		tracksQuery,
	}
}
