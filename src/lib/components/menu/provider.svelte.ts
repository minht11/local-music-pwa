import { setContext } from 'svelte'
import type { MenuItem, MenuOptions } from './types'

export const key = Symbol('menu')

export interface MenuContext {
	open: boolean
	items: MenuItem[]
	targetElement?: HTMLElement
	options?: MenuOptions
	elementToRestoreFocus?: HTMLElement
}

export const provideMenu = () => {
	const state = $state<MenuContext>({
		open: false,
		items: [],
		targetElement: undefined,
		options: undefined,
		elementToRestoreFocus: undefined,
	})

	setContext(key, state)
}
