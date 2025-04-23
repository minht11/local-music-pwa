import { persist } from '$lib/helpers/persist.svelte.ts'
import type { LibraryItemSortKey, SortOrder } from '$lib/library/get/ids.ts'
import type { LibraryStoreName } from '$lib/library/types.ts'

export class LibraryStore<Slug extends LibraryStoreName> {
	searchTerm: string = $state('')

	order: SortOrder = $state<SortOrder>('asc')

	sortByKey: LibraryItemSortKey<Slug> = $state('name')

	constructor(slug: Slug) {
		persist(`library:${slug}`, this, ['sortByKey', 'order'])
	}
}
