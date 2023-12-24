import { getTracksIds } from '$lib/library/tracks.svelte.ts'
import type { PageLoad } from './$types'

const DATA_MAP = {
	tracks: {
		title: 'Tracks',
	},
	albums: {
		title: 'Albums',
	},
	artists: {
		title: 'Artists',
	},
	playlists: {
		title: 'Playlists',
	},
} as const

export const load: PageLoad = async (event) => {
	const slug = event.params.slug
	const data = DATA_MAP[slug]

	return {
		tracks: await getTracksIds(),
		hideBackButton: true,
		title: 'Library',
		pageTitle: `Library - ${data.title}`,
	}
}
