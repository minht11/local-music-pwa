import { getContext } from 'svelte'
import invariant from 'tiny-invariant'

export interface RootLayout {
	actions: Snippet
}

// TODO. Do we still need this?
export const useRootLayout = () => {
	const layout = getContext<RootLayout>('root-layout')

	invariant(layout, 'No root layout found')

	return layout
}
