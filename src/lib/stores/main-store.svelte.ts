import { persist } from '$lib/helpers/persist.svelte.ts'
import { isMobile } from '$lib/helpers/utils/is-mobile.ts'
import { argbFromHex } from '@material/material-color-utilities'
import { getContext, setContext } from 'svelte'
import { prefersReducedMotion } from 'svelte/motion'
import { MediaQuery } from 'svelte/reactivity'
import invariant from 'tiny-invariant'

export type AppTheme = 'light' | 'dark'
export type AppThemeOption = AppTheme | 'auto'

export type AppMotion = 'normal' | 'reduced'
export type AppMotionOption = AppMotion | 'auto'

export interface ModifyPlaylistOptions {
	id: number
	name: string
}

export class MainStore {
	theme: AppThemeOption = $state('auto')

	#deviceThemeDark = new MediaQuery('(prefers-color-scheme: dark)')

	get isThemeDark() {
		if (this.theme === 'auto') {
			return this.#deviceThemeDark.current
		}

		return this.theme === 'dark'
	}

	themeColorSeed = $state<null | number>(null)

	#hexColorSeed = $state<string | null>(null)

	get themeColorSeedHex() {
		return this.#hexColorSeed
	}

	set themeColorSeedHex(value: string | null) {
		this.#hexColorSeed = value
		this.themeColorSeed = value ? argbFromHex(value) : null
	}

	pickColorFromArtwork = $state(true)

	motion: AppMotionOption = $state('auto')

	get isReducedMotion() {
		const motion = this.motion === 'auto' ? prefersReducedMotion.current : this.motion

		return motion === 'reduced'
	}

	/**
	 * Controls whatever volume slider is visible.
	 * The initial value is false for mobile devices and true for desktop.
	 * User can change this setting.
	 */
	volumeSliderEnabled = $state(!isMobile())

	createNewPlaylistDialogOpen = $state(false)

	/** Contains playlist id while dialog is open */
	editPlaylistDialogOpen = $state<ModifyPlaylistOptions | null>(null)

	/** Contains playlist id while dialog is open */
	removePlaylistDialogOpen = $state<ModifyPlaylistOptions | null>(null)

	addTrackToPlaylistDialogOpen = $state<number | null>(null)

	constructor() {
		persist('main', this, ['theme', 'motion', 'pickColorFromArtwork', 'volumeSliderEnabled'])
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
