import type { PageLoad } from './$types'
import { LibraryStore } from './store.svelte'

type LibraryStoreNames = 'tracks' | 'albums' | 'artists'

interface LibraryPageDataBase<T extends LibraryStoreNames> {
	store: LibraryStore<T>
	title: string
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
		store: new LibraryStore('tracks', [
			nameSortOption,
			{
				name: 'Artist',
				key: 'artists',
			},
			{
				name: 'Album',
				key: 'album',
			},
			{
				name: 'Duration',
				key: 'duration',
			},
			{
				name: 'Year',
				key: 'year',
			},
		]),
		title: m.tracks(),
	},
	albums: {
		store: new LibraryStore('albums', [nameSortOption]),
		title: m.albums(),
	},
	artists: {
		store: new LibraryStore('artists', [nameSortOption]),
		title: m.artists(),
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
