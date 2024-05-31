import type { LayoutLoad } from './$types'

export const load: LayoutLoad = () => ({
	title: 'Player',
	noPlayerOverlay: true,
	noHeader: true,
	rootLayoutKey: () => 'player',
})
