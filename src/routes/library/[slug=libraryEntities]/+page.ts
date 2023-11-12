import { readable } from 'svelte/store'
import type { PageLoad } from './$types'

const createTimeStore = () => {
	const time = readable(new Date(), (set) => {
		set(new Date())

		const interval = setInterval(() => {
			set(new Date())
		}, 1000)

		return () => {
			console.log('Clearing interval')
			clearInterval(interval)
		}
	})

	return time
}

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

export const load: PageLoad = (event) => {
	const slug = event.params.slug
	const data = DATA_MAP[slug]

	return {
		time: createTimeStore(),
		hideBackButton: true,
		title: 'Library',
		pageTitle: `Library - ${data.title}`,
	}
}
