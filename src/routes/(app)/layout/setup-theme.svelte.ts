const updateWindowTileBarColor = (isDark: boolean) => {
	const element = document.querySelector(
		`meta[name="theme-color"][media="(prefers-color-scheme: ${isDark ? 'dark' : 'light'})"]`,
	)

	// Background color uses --surface color
	const surfaceColor = window.getComputedStyle(document.documentElement).backgroundColor
	element?.setAttribute('content', surfaceColor)
}

export const setupTheme = (): void => {
	const player = usePlayer()
	const mainStore = useMainStore()

	let initial = true
	$effect.pre(() => {
		const isDark = mainStore.isThemeDark
		const artworkArgb = mainStore.pickColorFromArtwork
			? player.activeTrack?.primaryColor
			: undefined

		const argbOrHex = artworkArgb ?? mainStore.customThemePaletteHex

		if (initial) {
			initial = false

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

	$effect.pre(() => {
		document.documentElement.classList.toggle('dark', mainStore.isThemeDark)
	})
}
