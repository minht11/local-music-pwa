import { defineListQuery } from '$lib/db/db-fast.svelte'
import type { AppDB } from '$lib/db/get-db'
import {
	type LibraryEntitySortKey,
	type LibraryEntityStoreName,
	type SortOrder,
	getEntityIds,
} from '$lib/library/general'
import type { IndexNames } from 'idb'

const defaultData = {
	order: 'asc',
	sortBy: 'name',
}

export const getPersistedData = (key: string) => {
	const data = localStorage.getItem(`library-page:${key}`)

	return data ? JSON.parse(data) : defaultData
}

export const setPersistedData = (key: string, data: typeof defaultData) => {
	localStorage.setItem(`library-page:${key}`, JSON.stringify(data))
}

export type SortOption<StoreName extends LibraryEntityStoreName> = {
	name: string
	key: IndexNames<AppDB, StoreName>
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

	searchTerm = $state('')

	order = $state<SortOrder>('asc')

	sortOptions = $state<SortOption<StoreName>[]>([])
	sortByKey = $state<LibraryEntitySortKey<StoreName>>(this.sortOptions[0]?.key ?? 'name')
	sortBy = $derived(this.sortOptions.find((option) => option.key === this.sortByKey))

	#query = defineListQuery(() => this.storeName, {
		key: () => [
			'library',
			this.storeName,
			this.sortByKey,
			this.order,
			this.searchTerm.toLowerCase().trim(),
		],
		fetcher: ([, name, sortKey, order, searchTerm]) =>
			getEntityIds(name, {
				sort: sortKey,
				order,
				searchTerm,
				searchFn: (value) => value.name.toLowerCase().includes(searchTerm),
			}),
	})

	preloadData = () => this.#query.preload()

	hydrateQuery = () => {
		this.#query.hydrate()
	}

	get items() {
		return this.#query.value
	}

	constructor(options: LibraryStoreOptions<StoreName>) {
		this.storeName = options.storeName
		this.singularTitle = options.singularTitle
		this.pluralTitle = options.pluralTitle
		this.sortOptions = options.sortOptions
	}
}
