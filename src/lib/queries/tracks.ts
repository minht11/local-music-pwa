import { getDB } from '$lib/db/get-db'
import { type PageQueryResult, createPageQuery } from '$lib/db/query.svelte'

export const createTracksCountPageQuery = (): PageQueryResult<number> =>
	createPageQuery({
		key: [],
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
