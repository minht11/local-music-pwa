import type { AppDB } from '$lib/db/get-db'
import {
	type LibraryEntitySortKey,
	type LibraryEntityStoreName,
	type SortOrder,
	getEntityIds,
} from '$lib/library/general'
import type { IndexNames } from 'idb'
import { untrack } from 'svelte'
import invariant from 'tiny-invariant'

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

	order = $state<SortOrder>('asc')

	sortOptions = $state<SortOption<StoreName>[]>([])
	sortByKey = $state<LibraryEntitySortKey<StoreName>>(this.sortOptions[0]?.key ?? 'name')
	sortBy = $derived(this.sortOptions.find((option) => option.key === this.sortByKey))

	data = $state<number[]>([])

	constructor(storeName: StoreName, title: string, sortOptions: SortOption<StoreName>[]) {
		this.storeName = storeName
		this.title = title
		this.sortOptions = sortOptions
	}

	async #loadData() {
		const key = this.sortBy?.key

		invariant(key, 'Sort key is not defined')

		this.data = await getEntityIds(this.storeName, key, this.order)
	}

	preloadData() {
		return this.#loadData()
	}

	mountSetup() {
		$effect(() => {
			this.order
			this.sortBy

			untrack(() => {
				this.#loadData()
			})

			console.log('Mount', this.storeName)
		})
	}
}
