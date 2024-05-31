import { persist } from '$lib/helpers/persist.svelte.ts'
import { getContext, setContext } from 'svelte'
import invariant from 'tiny-invariant'

export type AppTheme = 'light' | 'dark'
export type AppThemeOption = AppTheme | 'auto'

export class MainStore {
	theme: AppThemeOption = $state('auto')

	#themeMedia = window.matchMedia('(prefers-color-scheme: dark)')

	#deviceTheme: AppTheme = $state(this.#themeMedia.matches ? 'dark' : 'light')

	readonly realTheme: AppTheme = $derived(this.theme === 'auto' ? this.#deviceTheme : this.theme)

	get themeIsDark() {
		return this.realTheme === 'dark'
	}

	pickColorFromArtwork = $state(true)

	constructor() {
		persist('main', this, ['theme', 'pickColorFromArtwork'])

		window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
			this.#deviceTheme = e.matches ? 'dark' : 'light'
		})
	}
}

const mainContext = Symbol('main-store')

export const provideMainStore = () => {
	const main = new MainStore()

	setContext(mainContext, main)

	return main
}

export const useMainStore = () => {
	const main = getContext<MainStore>(mainContext)

	invariant(main, 'No main store found')

	return main
}
