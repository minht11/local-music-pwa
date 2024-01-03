import type { PageLoad } from './$types'

export const load: PageLoad = () => {
	return {
		title: 'Player',
		hidePlayerOverlay: true,
		disableHeaderElevation: true,
	}
}
