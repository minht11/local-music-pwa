import { isSafari } from '$lib/helpers/utils/ua'

const updateThemeMetaElement = (element: Element) => {
	// Background color uses --surface color
	const surfaceColor = window.getComputedStyle(document.documentElement).backgroundColor
	element.setAttribute('content', surfaceColor)
}

const updateWindowTileBarColor = (isDark: boolean) => {
	// Safari does not respect media queries on theme meta element,
	// so instead we update all elements every time
	if (isSafari()) {
		const metaTags = document.querySelectorAll('meta[name="theme-color"]')

		for (const element of metaTags) {
			updateThemeMetaElement(element)
		}

		return
	}

	const element = document.querySelector(
		`meta[name="theme-color"][media="(prefers-color-scheme: ${isDark ? 'dark' : 'light'})"]`,
	)

	if (element) {
		updateThemeMetaElement(element)
	}
}

export const setupTheme = (): void => {
	const player = usePlayer()
	const mainStore = useMainStore()

	$effect.pre(() => {
		document.documentElement.classList.toggle('dark', mainStore.isThemeDark)
	})

	let initial = true
	$effect.pre(() => {
		const isDark = mainStore.isThemeDark
		const artworkArgb = mainStore.pickColorFromArtwork
			? player.activeTrack?.primaryColor
			: undefined

		const argbOrHex = artworkArgb ?? mainStore.customThemePaletteHex

		if (initial) {
			initial = false

			if (isSafari()) {
				updateWindowTileBarColor(isDark)
			}

			// On initial load, if no custom color is set we can skip
			// loading module which relatively heavy
			if (!argbOrHex) {
				return
			}
		}

		void import('$lib/theme.ts').then(({ updateThemeCssVariables }) => {
			updateThemeCssVariables(argbOrHex, isDark)
			updateWindowTileBarColor(isDark)
		})
	})
}
