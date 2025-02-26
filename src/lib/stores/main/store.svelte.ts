import { persist } from '$lib/helpers/persist.svelte.ts'
import { isMobile } from '$lib/helpers/utils/is-mobile.ts'
import { prefersReducedMotion } from 'svelte/motion'
import { MediaQuery } from 'svelte/reactivity'

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

	/**
	 * Controls whatever volume slider is visible.
	 * The initial value is false for mobile devices and true for desktop.
	 * User can change this setting.
	 */
	volumeSliderEnabled: boolean = $state(!isMobile())

	createNewPlaylistDialogOpen: boolean = $state(false)

	/** Contains playlist id while dialog is open */
	editPlaylistDialogOpen: ModifyPlaylistOptions | null = $state(null)

	/** Contains playlist id while dialog is open */
	removePlaylistDialogOpen: ModifyPlaylistOptions | null = $state(null)

	addTrackToPlaylistDialogOpen: number | null = $state(null)

	constructor() {
		persist('main', this, [
			'theme',
			'motion',
			'pickColorFromArtwork',
			'customThemePaletteHex',
			'volumeSliderEnabled',
		])
	}
}
