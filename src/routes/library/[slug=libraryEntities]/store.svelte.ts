import {
	type LibraryEntitySortKey,
	type LibraryEntityStoreName,
	type SortOrder,
	getEntityIds,
} from '$lib/library/general'
import { untrack } from 'svelte'

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

export class LibraryStore<StoreName extends LibraryEntityStoreName> {
	order = $state<SortOrder>('asc')
	sortBy = $state<LibraryEntitySortKey<StoreName>>('name')

	data = $state<number[]>([])

	constructor(public storeName: StoreName) {}

	async #loadData() {
		this.data = await getEntityIds(this.storeName, this.sortBy, this.order)
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
