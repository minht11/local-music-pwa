import { goto } from '$app/navigation'
import { defineListQuery, definePageQuery } from '$lib/db/db-fast.svelte.ts'
import { getDB, getValue } from '$lib/db/get-db.ts'
import { preloadTracks } from '$lib/library/tracks.svelte.ts'
import { error } from '@sveltejs/kit'
import invariant from 'tiny-invariant'
import type { PageLoad } from './$types.ts'

type DetailsType = 'albums' | 'artists' | 'playlists'

const defineDetailsQuery = <T extends DetailsType>(storeName: T, id: number) =>
	definePageQuery({
		key: () => [storeName, id],
		fetcher: async () => {
			const item = await getValue(storeName, id)

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
	})

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

export const load: PageLoad = async (event) => {
	const { slug } = event.params

	if (slug === 'tracks') {
		error(404)
	}

	const id = Number(event.params.id)

	if (!Number.isFinite(id)) {
		error(404)
	}

	const itemQuery = defineDetailsQuery(slug, id)

	const album = await itemQuery.preload()

	if (!album) {
		error(404)
	}

	const tracksQuery = defineListQuery(() => 'albums', {
		key: () => ['albums-tracks-list', album.name],
		fetcher: async ([, name]) => {
			const db = await getDB()

			let keys: number[]
			if (slug === 'playlists') {
				const keysResult = await db.getAllKeysFromIndex('playlistsTracks', 'playlistId', id)
				keys = keysResult.map(([, trackId]) => trackId)
			} else {
				const index = configMap[slug].index
				keys = await db.getAllKeysFromIndex('tracks', index, name)
			}

			return keys
		},
		// TODO.
		// onDatabaseChange: (changes, { mutate }) => {
	})

	const trackIds = await tracksQuery.preload()
	await preloadTracks(trackIds, 10)

	return {
		slug,
		libraryType: slug,
		title: 'Album',
		itemQuery,
		tracksQuery,
	}
}
