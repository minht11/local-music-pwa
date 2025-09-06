import {
	argbFromHex,
	Cam16,
	type CorePalette,
	Hct,
	hexFromArgb,
	// biome-ignore lint/style/noRestrictedImports: Main module for theme utilities
} from '@material/material-color-utilities'

/** @public */
export type PaletteToken =
	| 'primary'
	| 'onPrimary'
	| 'primaryContainer'
	| 'onPrimaryContainer'
	| 'secondary'
	| 'onSecondary'
	| 'secondaryContainer'
	| 'secondaryContainerVariant'
	| 'onSecondaryContainer'
	| 'tertiary'
	| 'onTertiary'
	| 'tertiaryContainer'
	| 'onTertiaryContainer'
	| 'error'
	| 'onError'
	| 'errorContainer'
	| 'onErrorContainer'
	| 'surface'
	| 'onSurface'
	| 'surfaceVariant'
	| 'onSurfaceVariant'
	| 'surfaceContainerHighest'
	| 'surfaceContainerHigh'
	| 'surfaceContainer'
	| 'surfaceContainerLow'
	| 'surfaceContainerLowest'
	| 'surfaceBright'
	| 'surfaceDim'
	| 'outline'
	| 'outlineVariant'
	| 'shadow'
	| 'scrim'
	| 'inverseSurface'
	| 'inverseOnSurface'
	| 'inversePrimary'

type Tone = keyof CorePalette
type PaletteTokenInput = readonly [tone: Tone, light: number, dark: number]

type PaletteTokensInputMap = Record<PaletteToken, PaletteTokenInput>

const COLOR_TOKENS_GENERATION_MAP: PaletteTokensInputMap = {
	primary: ['a1', 40, 80],
	onPrimary: ['a1', 100, 20],
	primaryContainer: ['a1', 90, 30],
	onPrimaryContainer: ['a1', 10, 90],
	secondary: ['a2', 40, 80],
	onSecondary: ['a2', 100, 20],
	secondaryContainer: ['a2', 90, 30],
	secondaryContainerVariant: ['a2', 75, 15],
	onSecondaryContainer: ['a2', 10, 90],
	tertiary: ['a3', 40, 80],
	onTertiary: ['a3', 100, 20],
	tertiaryContainer: ['a3', 90, 30],
	onTertiaryContainer: ['a3', 10, 90],
	error: ['error', 40, 80],
	onError: ['error', 100, 20],
	errorContainer: ['error', 90, 30],
	onErrorContainer: ['error', 10, 90],
	surface: ['n1', 98, 10],
	onSurface: ['n1', 10, 90],
	surfaceVariant: ['n2', 90, 30],
	onSurfaceVariant: ['n2', 30, 80],
	surfaceContainerHighest: ['n1', 90, 22],
	surfaceContainerHigh: ['n1', 92, 17],
	surfaceContainer: ['n1', 94, 12],
	surfaceContainerLow: ['n1', 96, 10],
	surfaceContainerLowest: ['n1', 100, 4],
	surfaceBright: ['n1', 98, 24],
	surfaceDim: ['n1', 87, 6],
	outline: ['n2', 50, 60],
	outlineVariant: ['n2', 80, 30],
	shadow: ['n1', 0, 0],
	scrim: ['n1', 0, 0],
	inverseSurface: ['n1', 20, 90],
	inverseOnSurface: ['n1', 95, 10],
	inversePrimary: ['a1', 80, 40],
}

const COLOR_TOKENS_GENERATION_ENTRIES = Object.entries(COLOR_TOKENS_GENERATION_MAP) as [
	PaletteToken,
	PaletteTokenInput,
][]

const createTonalPalette = (hue: number, chroma: number) => ({
	tone: (tone: number) => Hct.from(hue, chroma, tone).toInt(),
})

interface TonalPalette {
	tone(argb: number): number
}

type ThemeEntry = [key: PaletteToken, hexValue: string]

/** @public */
export const getThemePaletteRgbEntries = (argb: number, isDark: boolean): ThemeEntry[] => {
	const cam16 = Cam16.fromInt(argb)
	const hue = cam16.hue
	const chroma = cam16.chroma

	// We do not use material-color-utilities CorePalette because of large bundle size
	// and because its color scheme is bit outdated with the current design guidelines
	const palette: Record<Tone, TonalPalette> = {
		a1: createTonalPalette(hue, Math.max(48, chroma)),
		a2: createTonalPalette(hue, 16),
		a3: createTonalPalette(hue + 60, 24),
		n1: createTonalPalette(hue, 6),
		n2: createTonalPalette(hue, 8),
		error: createTonalPalette(25, 84),
	}

	const transformedEntries = COLOR_TOKENS_GENERATION_ENTRIES.map(([key, value]): ThemeEntry => {
		const [toneName, light, dark] = value

		const tone = isDark ? dark : light
		const argbValue = palette[toneName].tone(tone)

		return [key, hexFromArgb(argbValue)]
	})

	return transformedEntries
}

const clearThemeCssVariables = (): void => {
	for (const [key] of COLOR_TOKENS_GENERATION_ENTRIES) {
		document.documentElement.style.removeProperty(`--color-${key}`)
	}
}

const setThemeCssVariables = (argb: number, isDark: boolean): void => {
	const palette = getThemePaletteRgbEntries(argb, isDark)

	for (const [key, hex] of palette) {
		// Use !important to override the light-dark() fallback values
		document.documentElement.style.setProperty(`--color-${key}`, hex, 'important')
	}
}

/** @public */
export const updateThemeCssVariables = (
	argbOrHex: number | string | null,
	isDark: boolean,
): void => {
	const argb =
		typeof argbOrHex === 'number'
			? argbOrHex
			: typeof argbOrHex === 'string'
				? argbFromHex(argbOrHex)
				: null

	if (argb) {
		setThemeCssVariables(argb, isDark)
	} else {
		clearThemeCssVariables()
	}
}
