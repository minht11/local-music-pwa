import { definePageQuery } from '$lib/db/db-fast.svelte.ts'
import { getDB } from '$lib/db/get-db'
import type { PageLoad } from './$types.ts'

const countQuery = definePageQuery({
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
		}

		if (countDiff !== 0) {
			mutate((v = 0) => v + countDiff)
		}
	},
})

const directoriesQuery = definePageQuery({
	key: ['directories'],
	fetcher: async () => {
		const db = await getDB()

		return db.getAll('directories')
	},
	onDatabaseChange: (changes, { mutate }) => {
		for (const change of changes) {
			if (change.storeName === 'directories') {
				if (change.operation === 'delete') {
					mutate((v) => v?.filter((dir) => dir.id !== change.key))
				} else if (change.operation === 'add') {
					mutate((v = []) => [...v, change.value])
				}
				// TODO. Handle other operations
			}
		}
	},
})

export const load = (async () => {
	await Promise.all([countQuery.preload(), directoriesQuery.preload()])

	return {
		countQuery,
		directoriesQuery,
		backButton: true,
		title: 'Settings',
	}
}) satisfies PageLoad
