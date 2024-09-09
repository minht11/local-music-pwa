import { getDB } from '$lib/db/get-db'
import { createPageQuery } from '$lib/db/query.svelte.ts'
import { createTracksCountPageQuery } from '$lib/queries/tracks.ts'
import type { PageLoad } from './$types.ts'

const useDirectoriesQuery = () =>
	createPageQuery({
		key: [],
		fetcher: async () => {
			const db = await getDB()

			return db.getAll('directories')
		},
		onDatabaseChange: (changes, { refetch, mutate }) => {
			for (const change of changes) {
				if (change.storeName === 'directories') {
					if (change.operation === 'delete') {
						mutate((v) => v?.filter((dir) => dir.id !== change.key))
					} else if (change.operation === 'add') {
						mutate((v = []) => [...v, change.value])
					} else if (change.operation === 'update') {
						refetch()
					}
				}
			}
		},
	})

export const load: PageLoad = async () => {
	const [count, directories] = await Promise.all([
		createTracksCountPageQuery(),
		useDirectoriesQuery(),
	])

	return {
		countQuery: count,
		directoriesQuery: directories,
		backButton: true,
		title: 'Settings',
	}
}
