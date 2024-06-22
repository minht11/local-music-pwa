import type { LayoutLoad } from './$types.ts'

export const load: LayoutLoad = () => ({
	title: 'Player',
	noPlayerOverlay: true,
	rootLayoutKey: () => 'player',
})
