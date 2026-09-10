import { prefersReducedMotion } from 'svelte/motion'
import { MediaQuery } from 'svelte/reactivity'
import { getPersistedValue, persist } from '$lib/helpers/persist.svelte.ts'

export type AppTheme = 'light' | 'dark'
export type AppThemeOption = AppTheme | 'auto'

export type AppMotion = 'normal' | 'reduced'
export type AppMotionOption = AppMotion | 'auto'

export const getPersistedLibrarySplitLayoutEnabled = (): boolean =>
	getPersistedValue('main', 'librarySplitLayoutEnabled', true)

/** @public */
export class MainStore {
	theme: AppThemeOption = $state('auto')

	#deviceThemeDark = new MediaQuery('(prefers-color-scheme: dark)')

	get isThemeDark(): boolean {
		if (this.theme === 'auto') {
			return this.#deviceThemeDark.current
		}

		return this.theme === 'dark'
	}

	motion: AppMotionOption = $state('auto')

	get isReducedMotion(): boolean {
		const motion = this.motion === 'auto' ? prefersReducedMotion.current : this.motion

		return motion === 'reduced'
	}

	pickColorFromArtwork: boolean = $state(true)

	customThemePaletteHex: string | null = $state(null)

	appInstallPromptEvent: BeforeInstallPromptEvent | null = $state(null)

	librarySplitLayoutEnabled: boolean = $state(true)

	constructor() {
		persist('main', this, [
			'theme',
			'motion',
			'pickColorFromArtwork',
			'customThemePaletteHex',
			'librarySplitLayoutEnabled',
		])
	}
}
