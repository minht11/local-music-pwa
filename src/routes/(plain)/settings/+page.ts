import { type Directory, LEGACY_NO_NATIVE_DIRECTORY } from '$lib/db/database-types.ts'
import { getDB } from '$lib/db/get-db'
import { createPageQuery } from '$lib/db/query.svelte.ts'
import { createTracksCountPageQuery } from '$lib/queries/tracks.ts'
import type { PageLoad } from './$types.ts'

export type DirectoryWithCount = { count: number } & (
	| {
			id: typeof LEGACY_NO_NATIVE_DIRECTORY
			legacy: true
	  }
	| (Directory & { legacy?: false })
)

const createDirectoriesPageQuery = () =>
	createPageQuery({
		key: [],
		fetcher: async (): Promise<DirectoryWithCount[]> => {
			const db = await getDB()
			const directories = await db.getAll('directories')
			const tx = db.transaction('tracks')
			const directoriesIndex = tx.objectStore('tracks').index('directory')

			const directoriesWithCount = await Promise.all([
				...directories.map(async (directory) => ({
					...directory,
					count: await directoriesIndex.count(directory.id),
				})),
				directoriesIndex.count(LEGACY_NO_NATIVE_DIRECTORY).then(
					(count): DirectoryWithCount => ({
						id: LEGACY_NO_NATIVE_DIRECTORY,
						legacy: true,
						count,
					}),
				),
			])

			const legacyDir = directoriesWithCount.at(-1)
			if (legacyDir && legacyDir.count === 0) {
				// Remove the legacy directory if it has no tracks
				directoriesWithCount.pop()
			}

			return directoriesWithCount
		},
		onDatabaseChange: (changes, { refetch }) => {
			for (const change of changes) {
				if (change.storeName === 'tracks' || change.storeName === 'directories') {
					// TODO. This could be optimized
					refetch()
				}
			}
		},
	})

export const load: PageLoad = async () => {
	const [count, directories] = await Promise.all([
		createTracksCountPageQuery(),
		createDirectoriesPageQuery(),
	])

	return {
		countQuery: count,
		directoriesQuery: directories,
		title: 'Settings',
	}
}
