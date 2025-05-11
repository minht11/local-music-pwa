const updateStyles = async (argbOrHex: number | string | null, isDark: boolean) => {
	const module = await import('$lib/theme.ts')

	const argb =
		typeof argbOrHex === 'number'
			? argbOrHex
			: typeof argbOrHex === 'string'
				? module.argbFromHex(argbOrHex)
				: null

	if (argb) {
		module.setThemeCssVariables(argb, isDark)
	} else {
		module.clearThemeCssVariables()
	}
}

const updateWindowTileBarColor = () => {
	const element = document.querySelector('meta[name="theme-color"]')
	if (!element) {
		return
	}

	const surfaceColor = window.getComputedStyle(document.body).getPropertyValue('--color-surface')
	element.setAttribute('content', surfaceColor)
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
				updateWindowTileBarColor()

				return
			}
		}

		void updateStyles(argbOrHex, isDark).then(updateWindowTileBarColor)
	})

	$effect.pre(() => {
		document.documentElement.classList.toggle('dark', mainStore.isThemeDark)
	})
}
