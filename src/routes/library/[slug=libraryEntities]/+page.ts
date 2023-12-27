import type { AppDB } from '$lib/db/get-db'
import { getEntityIds } from '$lib/library/general'
import type { IndexNames } from 'idb'
import type { PageLoad } from './$types'
import { LibraryStore } from './store.svelte'

type LibraryStoreNames = 'tracks' | 'albums' | 'artists'

interface LibraryPageDataBase<T extends LibraryStoreNames> {
	store: LibraryStore<T>
	title: string
	storeName: T
	sortOptions?: readonly {
		name: string
		key: IndexNames<AppDB, T>
	}[]
}

type DataMap = {
	[K in LibraryStoreNames]: LibraryPageDataBase<K>
}

const nameSortOption = {
	name: 'Name',
	key: 'name',
} as const

const dataMap = {
	tracks: {
		store: new LibraryStore('tracks'),
		title: m.tracks(),
		storeName: 'tracks',
		sortOptions: [nameSortOption],
	},
	albums: {
		store: new LibraryStore('albums'),
		title: m.albums(),
		storeName: 'albums',
		sortOptions: [nameSortOption],
	},
	artists: {
		store: new LibraryStore('artists'),
		title: m.artists(),
		storeName: 'artists',
		sortOptions: [nameSortOption],
	},
} satisfies DataMap

export const load: PageLoad = async (event) => {
	const { slug } = event.params

	console.log('Load', slug)

	if (slug === 'playlists') {
		throw new Error('Not implemented')
	}

	const data = dataMap[slug]

	await data.store.preloadData()

	return {
		store: data.store,
		hideBackButton: true,
		title: 'Library',
		pageTitle: `Library - ${data.title}`,
	}
}
