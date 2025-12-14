import { persist } from '$lib/helpers/persist.svelte.ts'
import type { LibraryItemSortKey, SortOrder } from '$lib/library/get/ids.ts'
import type { LibraryStoreName } from '$lib/library/types.ts'

export class LibraryStore<Slug extends LibraryStoreName> {
	searchTerm: string = $state('')

	order: SortOrder = $state<SortOrder>('asc')

	sortByKey: LibraryItemSortKey<Slug> = $state('name')

	constructor(slug: Slug) {
		persist(`library:${slug}`, this, ['sortByKey', 'order'])

		// Previous version used 'album' key for sorting track by album.
		// Update value after loading persisted state.
		if (slug === 'tracks') {
			if (this.sortByKey === 'album') {
				this.sortByKey = 'byAlbumSorted' as LibraryItemSortKey<Slug>
			}
		}
	}
}
