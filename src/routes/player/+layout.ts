import type { LayoutLoad } from './$types.ts'

export const load: LayoutLoad = () => ({
	title: 'Player',
	noPlayerOverlay: true,
	noHeader: true,
	rootLayoutKey: () => 'player',
})
