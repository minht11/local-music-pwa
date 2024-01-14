import { defineQuery } from '$lib/db/db-fast.svelte'
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

	const tracksQuery = defineQuery({
		key: () => ['albums-tracks-list', albumValue.name],
		fetcher: async ([, name]) => {
			const db = await getDB()
			const keys = await db.getAllKeysFromIndex('tracks', 'album', name)

			return keys
		},
		onDatabaseChange: (changes, { mutate, refetch }) => {
			let needRefetch = false
			for (const change of changes) {
				if (change.storeName !== 'tracks') {
					continue
				}

				if (change.operation === 'add') {
					// We have no way of knowing where should the new item be inserted.
					// So we just refetch the whole list.
					needRefetch = true
					break
				}

				const id = change.id
				if (change.operation === 'delete' && id !== undefined) {
					mutate((value) => {
						if (!value) {
							return value
						}

						const index = value.indexOf(id)

						value.splice(index, 1)

						return value
					})
				}
			}

			if (needRefetch) {
				refetch()
			}
		},
	})

	return {
		title: 'Album',
		albumQuery: album,
		tracksQuery: await tracksQuery.createPreloaded(),
		// pageTitle: `Album - ${store.title}`,
	}
}
