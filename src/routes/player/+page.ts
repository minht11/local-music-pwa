import type { PageLoad } from './$types'

export const load: PageLoad = ({ url }) => {
	const isQueueOpen = url.searchParams.has('queue')

	return {
		title: 'Player',
		noPlayerOverlay: true,
		noHeader: true,
		disableContentPadding: true,
		isQueueOpen,
	}
}
