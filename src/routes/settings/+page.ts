import { defineQuery } from '$lib/db/db-fast.svelte.ts'
import { getDB } from '$lib/db/get-db'
import type { PageLoad } from './$types'

const countQuery = defineQuery({
	key: ['tracks-count'],
	fetcher: async () => {
		const db = await getDB()

		return db.count('tracks')
	},
	onDatabaseChange: (changes, { mutate }) => {
		let countDiff = 0

		for (const change of changes) {
			if (change.storeName === 'tracks') {
				const { operation } = change

				if (operation === 'add') {
					countDiff += 1
				} else if (operation === 'delete') {
					countDiff -= 1
				}
			}
			// TODO. Handle clear all
		}

		mutate((v = 0) => v + countDiff)
	},
})

export const load = (async () => {
	return {
		countQuery: await countQuery.createPreloaded(),
		backButton: true,
		title: 'Settings',
	}
}) satisfies PageLoad
