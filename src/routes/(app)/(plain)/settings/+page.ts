import { getDatabase } from '$lib/db/database.ts'
import { createPageQuery, type PageQueryResult } from '$lib/db/query/page-query.svelte.ts'
import { debounce } from '$lib/helpers/utils/debounce.ts'
import { type Directory, LEGACY_NO_NATIVE_DIRECTORY } from '$lib/library/types.ts'

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
			const db = await getDatabase()
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
	directoriesQuery: PageQueryResult<DirectoryWithCount[]>
	title: string
}

export const load = async (): Promise<LoadResult> => {
	const directories = await createDirectoriesPageQuery()

	return {
		directoriesQuery: directories,
		title: m.settings(),
	}
}
