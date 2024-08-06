import { getDB } from '$lib/db/get-db'
import { definePageLoader } from '$lib/db/queries.svelte.ts'
import type { PageLoad } from './$types.ts'

const useCountLoader = () =>
	definePageLoader({
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
	const [count, directories] = await Promise.all([useCountLoader(), useDirectoriesLoader()])

	return {
		countLoader: count,
		directoriesLoader: directories,
		backButton: true,
		title: 'Settings',
	}
}
