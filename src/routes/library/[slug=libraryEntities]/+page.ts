import type { PageLoad } from './$types'
import { LibraryStore } from './store.svelte'

type LibraryStoreNames = 'tracks' | 'albums' | 'artists'

const nameSortOption = {
	name: 'Name',
	key: 'name',
} as const

const storeMap = {
	tracks: new LibraryStore('tracks', m.tracks(), [
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
	albums: new LibraryStore('albums', m.albums(), [nameSortOption]),
	artists: new LibraryStore('artists', m.artists(), [nameSortOption]),
} satisfies {
	[K in LibraryStoreNames]: LibraryStore<K>
}

export const load: PageLoad = async (event) => {
	const { slug } = event.params

	if (slug === 'playlists') {
		throw new Error('Not implemented')
	}

	const store = storeMap[slug]

	await store.preloadData()

	return {
		store,
		hideBackButton: true,
		title: 'Library',
		pageTitle: `Library - ${store.title}`,
	}
}
