import { getContext, setContext } from 'svelte'
import invariant from 'tiny-invariant'

const contextKey = Symbol('scroll-target')

export const provideScrollTarget = (node: () => HTMLElement) => {
	setContext(contextKey, node)
}

export const useScrollTarget = () => {
	const node = getContext<() => HTMLElement>(contextKey)

	invariant(node, 'No scroll target found')

	return node
}
