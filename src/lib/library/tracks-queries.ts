import { getDatabase } from '$lib/db/database'
import { createPageQuery, type PageQueryResult } from '$lib/db/query/page-query.svelte.ts'

export const createTracksCountPageQuery = (): Promise<PageQueryResult<number>> =>
	createPageQuery({
		key: [],
		fetcher: async () => {
			const db = await getDatabase()

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
