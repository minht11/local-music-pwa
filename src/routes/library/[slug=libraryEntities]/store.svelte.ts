import { definePageListLoader } from '$lib/db/queries.svelte'
import { persist } from '$lib/helpers/persist.svelte.ts'
import {
	type LibraryEntitySortKey,
	type LibraryEntityStoreName,
	type SortOrder,
	getEntityIds,
} from '$lib/library/general.ts'
import { FAVORITE_PLAYLIST_ID } from '$lib/library/playlists.svelte'

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

type LibraryStoreMapped = {
	[StoreName in LibraryEntityStoreName]: LibraryStore<StoreName>
}[LibraryEntityStoreName]

export const createLibraryStore = <Store extends LibraryStoreMapped>(store: Store) => {
	const storeName = store.storeName

	const query = definePageListLoader(storeName, {
		key: () => [
			store.storeName,
			store.sortByKey,
			store.order,
			store.searchTerm.toLowerCase().trim(),
		],
		fetcher: async ([name, sortKey, order, searchTerm]) => {
			const result = await getEntityIds(name, {
				sort: sortKey,
				order,
				searchTerm,
				searchFn: (value) => value.name.toLowerCase().includes(searchTerm),
			})

			if (store) {
				return [FAVORITE_PLAYLIST_ID, ...result]
			}

			return result
		},
	})

	return query
}
