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

export class LibraryStore<StoreName extends LibraryEntityStoreName> {
	storeName: StoreName
	title: string

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
		fetcher: async ([, name, sortKey, order, searchTerm]) =>
			getEntityIds(name, {
				sort: sortKey,
				order,
				searchTerm,
				searchFn: (value) => value.name.toLowerCase().includes(searchTerm),
			}),
	})

	preloadData = () => this.#query.preload()

	// TODO.
	query = () => {
		const query = this.#query.create()

		return {
			get value() {
				return query.value
			},
		}
	}

	constructor(storeName: StoreName, title: string, sortOptions: SortOption<StoreName>[]) {
		this.storeName = storeName
		this.title = title
		this.sortOptions = sortOptions
	}
}
