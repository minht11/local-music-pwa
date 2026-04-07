import { prefersReducedMotion } from 'svelte/motion'
import { MediaQuery } from 'svelte/reactivity'
import { supportsChangingAudioVolume } from '$lib/helpers/audio.ts'
import { getPersistedValue, persist } from '$lib/helpers/persist.svelte.ts'
import { isMobile } from '$lib/helpers/utils/ua.ts'
import type { UpdatePlaylistOptions } from '$lib/library/playlists-actions'
import type { LibraryStoreName } from '$lib/library/types'
import type { BookmarkDialogState } from '$lib/rajneesh/bookmarks/dialog-state.ts'

export type AppTheme = 'light' | 'dark'
export type AppThemeOption = AppTheme | 'auto'

export type AppMotion = 'normal' | 'reduced'
export type AppMotionOption = AppMotion | 'auto'

export interface RemoveLibraryItemOptions {
	id: number
	name: string
	storeName: LibraryStoreName
}

export const getPersistedLibrarySplitLayoutEnabled = (): boolean =>
	getPersistedValue('main', 'librarySplitLayoutEnabled', true)

const isIndiaBasedUser = (): boolean => {
	if (typeof window === 'undefined') {
		return false
	}

	if (typeof navigator !== 'undefined') {
		const locales = [navigator.language, ...(navigator.languages ?? [])].filter(
			(value): value is string => !!value,
		)

		if (locales.some((locale) => locale.toUpperCase().endsWith('-IN'))) {
			return true
		}
	}

	try {
		const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
		return timezone === 'Asia/Kolkata' || timezone === 'Asia/Calcutta'
	} catch {
		return false
	}
}

export const getDefaultHindiOnly = (): boolean => isIndiaBasedUser()

export const getPersistedHindiOnly = (): boolean =>
	getPersistedValue('main', 'hindiOnly', getDefaultHindiOnly())

export class MainStore {
	theme: AppThemeOption = $state('dark')

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
	volumeSliderEnabled: boolean = $state(supportsChangingAudioVolume() ? !isMobile() : false)

	createNewPlaylistDialogOpen: boolean = $state(false)

	editPlaylistDialogOpen: UpdatePlaylistOptions | null = $state(null)

	removeLibraryItemOpen: RemoveLibraryItemOptions | null = $state(null)

	addTrackToPlaylistDialogOpen: number[] | null = $state(null)

	bookmarkDialogOpen: BookmarkDialogState | null = $state(null)

	appInstallPromptEvent: BeforeInstallPromptEvent | null = $state(null)

	/** Whether the app is already installed (running in standalone mode) */
	isAppInstalled: boolean = $state(false)

	librarySplitLayoutEnabled: boolean = $state(true)

	/** When true, only Hindi discourses are shown (English filtered out). */
	hindiOnly: boolean = $state(getDefaultHindiOnly())

	constructor() {
		persist('main', this, [
			'theme',
			'motion',
			'pickColorFromArtwork',
			'customThemePaletteHex',
			'volumeSliderEnabled',
			'librarySplitLayoutEnabled',
			'hindiOnly',
		])
	}
}
