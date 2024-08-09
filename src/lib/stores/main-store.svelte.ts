import { persist } from '$lib/helpers/persist.svelte.ts'
import { isMobile } from '$lib/helpers/utils/is-mobile.ts'
import { argbFromHex } from '@material/material-color-utilities'
import { getContext, setContext } from 'svelte'
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

	#themeMedia = window.matchMedia('(prefers-color-scheme: dark)')

	#deviceTheme: AppTheme = $state(this.#themeMedia.matches ? 'dark' : 'light')

	readonly realTheme: AppTheme = $derived(this.theme === 'auto' ? this.#deviceTheme : this.theme)

	get themeIsDark() {
		return this.realTheme === 'dark'
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
		// TODO. Add system setting
		return this.motion === 'reduced'
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
		persist('main', this, ['theme', 'pickColorFromArtwork', 'volumeSliderEnabled'])

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
