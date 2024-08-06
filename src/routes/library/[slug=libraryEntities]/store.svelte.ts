import { persist } from '$lib/helpers/persist.svelte.ts'
import type {
	LibraryEntitySortKey,
	LibraryEntityStoreName,
	SortOrder,
} from '$lib/library/general.ts'

export type SortOption<StoreName extends LibraryEntityStoreName> = {
	name: string
	key: LibraryEntitySortKey<StoreName>
}

export interface LibraryStoreOptions<StoreName extends LibraryEntityStoreName> {
	storeName: StoreName
	singularTitle: string
	pluralTitle: string
	sortOptions: SortOption<StoreName>[]
}

export class LibraryStore<StoreName extends LibraryEntityStoreName> {
	storeName: StoreName

	singularTitle: string

	pluralTitle: string

	searchTerm: string = $state('')

	order: SortOrder = $state<SortOrder>('asc')

	sortOptions: SortOption<StoreName>[] = $state([])

	sortByKey: LibraryEntitySortKey<StoreName> = $state(this.sortOptions[0]?.key ?? 'name')

	sortBy: SortOption<StoreName> | undefined = $derived(
		this.sortOptions.find((option) => option.key === this.sortByKey),
	)

	constructor(options: LibraryStoreOptions<StoreName>) {
		this.storeName = options.storeName
		this.singularTitle = options.singularTitle
		this.pluralTitle = options.pluralTitle
		this.sortOptions = options.sortOptions

		persist(`library:${this.storeName}`, this, ['sortByKey'])
	}
}
