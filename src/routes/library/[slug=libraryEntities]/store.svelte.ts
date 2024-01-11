import { defineQuery } from '$lib/db/db-fast.svelte'
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

	order = $state<SortOrder>('asc')

	sortOptions = $state<SortOption<StoreName>[]>([])
	sortByKey = $state<LibraryEntitySortKey<StoreName>>(this.sortOptions[0]?.key ?? 'name')
	sortBy = $derived(this.sortOptions.find((option) => option.key === this.sortByKey))

	#query = defineQuery({
		key: () => ['library', this.storeName, this.sortByKey, this.order],
		fetcher: async ([, name, sortKey, order]) => {
			const ids = await getEntityIds(name, sortKey, order)

			return ids
		},
		onDatabaseChange: (changes, { mutate, refetch }) => {
			console.log(changes)

			let needRefetch = false
			for (const change of changes) {
				if (change.storeName !== this.storeName) {
					continue
				}

				if (change.operation === 'add') {
					// We have no way of knowing where should the new item be inserted.
					// So we just refetch the whole list.
					needRefetch = true
					break
				}

				const id = change.id
				if (change.operation === 'delete' && id !== undefined) {
					mutate((value) => {
						const index = value.indexOf(id)

						value.splice(index, 1)

						return value
					})
				}
			}

			if (needRefetch) {
				refetch()
			}
		},
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
