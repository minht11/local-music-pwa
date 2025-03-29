import type { DbValue } from '$lib/db/get-db'
import { createPageListQuery, type PageQueryResultResolved } from '$lib/db/query.svelte'
import { persist } from '$lib/helpers/persist.svelte.ts'
import {
	getEntityIds,
	type LibraryEntitySortKey,
	type LibraryEntityStoreName,
	type SortOrder,
} from '$lib/library/general.ts'
import { FAVORITE_PLAYLIST_ID } from '$lib/library/playlists.svelte'

export type SortOption<StoreName extends LibraryEntityStoreName> = {
	name: string
	key: LibraryEntitySortKey<StoreName>
}

export interface DefineLibraryPageOptions<StoreName extends LibraryEntityStoreName> {
	singularTitle: string
	pluralTitle: string
	sortOptions: SortOption<StoreName>[]
}

class LibraryStore<StoreName extends LibraryEntityStoreName> {
	searchTerm: string = $state('')

	order: SortOrder = $state<SortOrder>('asc')

	sortOptions: SortOption<StoreName>[] = []

	sortByKey: LibraryEntitySortKey<StoreName> = $state(
		this.sortOptions[0]?.key ?? ('name' as LibraryEntitySortKey<StoreName>),
	)

	sortBy: SortOption<StoreName> | undefined = $derived(
		this.sortOptions.find((option) => option.key === this.sortByKey),
	)

	constructor(storeName: StoreName, sortOptions: SortOption<StoreName>[]) {
		this.sortOptions = sortOptions

		persist(`library:${storeName}`, this, ['sortByKey'])
	}
}

export type LibrarySearchFn<StoreName extends LibraryEntityStoreName> = (
	value: DbValue<StoreName>,
	searchTerm: string,
) => boolean

const defaultSearchFn: LibrarySearchFn<LibraryEntityStoreName> = (value, searchTerm) =>
	value.name.toLowerCase().includes(searchTerm)

export const defineLibraryPageData = <StoreName extends LibraryEntityStoreName>(
	storeName: StoreName,
	options: DefineLibraryPageOptions<StoreName>,
	searchFn: LibrarySearchFn<StoreName> = defaultSearchFn,
) => {
	return async (): Promise<{
		storeName: StoreName
		itemsQuery: PageQueryResultResolved<number[]>
		store: LibraryStore<StoreName>
		singularTitle: string
		pluralTitle: string
		sortOptions: SortOption<StoreName>[]
	}> => {
		const store = new LibraryStore(storeName, options.sortOptions)

		const itemsQuery = await createPageListQuery(storeName, {
			key: () => [
				storeName,
				store.sortByKey,
				store.order,
				store.searchTerm.toLowerCase().trim(),
			],
			fetcher: async ([name, sortKey, order, searchTerm]) => {
				const result = await getEntityIds(name, {
					sort: sortKey,
					order,
					searchTerm,
					searchFn: (value) => searchFn(value, searchTerm),
				})

				if (storeName === 'playlists') {
					return [FAVORITE_PLAYLIST_ID, ...result]
				}

				return result
			},
		})

		return {
			...options,
			storeName,
			itemsQuery,
			store,
		}
	}
}
