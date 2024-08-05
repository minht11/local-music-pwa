import { getContext, setContext } from 'svelte'
import invariant from 'tiny-invariant'

const contextKey = Symbol('scroll-target')

export const provideScrollTarget = (node: () => HTMLElement): void => {
	setContext(contextKey, node)
}

export const useScrollTarget = (): (() => HTMLElement) => {
	const node = getContext<() => HTMLElement>(contextKey)

	invariant(node, 'No scroll target found')

	return node
}
