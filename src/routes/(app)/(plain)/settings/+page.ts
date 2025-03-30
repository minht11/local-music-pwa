import { type Directory, LEGACY_NO_NATIVE_DIRECTORY } from '$lib/db/database-types.ts'
import { getDB } from '$lib/db/get-db'
import { createPageQuery, type PageQueryResultResolved } from '$lib/db/query.svelte.ts'
import { debounce } from '$lib/helpers/utils/debounce.ts'
import { createTracksCountPageQuery } from '$lib/queries/tracks.ts'
import type { PageLoad } from './$types.ts'

export type DirectoryWithCount = { count: number } & (
	| {
			id: typeof LEGACY_NO_NATIVE_DIRECTORY
			legacy: true
	  }
	| (Directory & { legacy?: false })
)

const debouncedRefetch = debounce((refetch: () => void) => {
	refetch()
}, 100)

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
					// While tracks are being imported/removed, the count may change frequently
					debouncedRefetch(refetch)
					break
				}
			}
		},
	})

interface LoadResult {
	countQuery: PageQueryResultResolved<number>
	directoriesQuery: PageQueryResultResolved<DirectoryWithCount[]>
	title: string
}

export const load: PageLoad = async (): Promise<LoadResult> => {
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
