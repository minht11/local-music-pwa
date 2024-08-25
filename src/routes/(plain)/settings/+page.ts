import { getDB } from '$lib/db/get-db'
import { definePageLoader } from '$lib/db/queries.svelte.ts'
import { useTracksCountLoader } from '$lib/loaders/tracks.ts'
import type { PageLoad } from './$types.ts'

const useDirectoriesLoader = () =>
	definePageLoader({
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
	const [count, directories] = await Promise.all([useTracksCountLoader(), useDirectoriesLoader()])

	return {
		countLoader: count,
		directoriesLoader: directories,
		backButton: true,
		title: 'Settings',
	}
}
