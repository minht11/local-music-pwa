import { persist } from '$lib/helpers/persist.svelte.ts'
import type {
	LibraryEntitySortKey,
	LibraryEntityStoreName,
	SortOrder,
} from '$lib/library/general.ts'

export class LibraryStore<Slug extends LibraryEntityStoreName> {
	searchTerm: string = $state('')

	order: SortOrder = $state<SortOrder>('asc')

	sortByKey: LibraryEntitySortKey<Slug> = $state('name')

	constructor(slug: Slug) {
		persist(`library:${slug}`, this, ['sortByKey', 'order'])
	}
}
