import {
	type CorePalette,
	Hct,
	argbFromHex,
	blueFromArgb,
	greenFromArgb,
	redFromArgb,
} from '@material/material-color-utilities'

export { argbFromHex }

type Tone = keyof CorePalette

type ColorTokenInput = readonly [tone: Tone, light: number, dark: number]

export interface ColorTokensInput {
	[key: string]: ColorTokenInput
}

/** @type {import('./types').ColorTokensInput} */
const COLOR_TOKENS_GENERATION_MAP = {
	primary: ['a1', 40, 80],
	onPrimary: ['a1', 100, 20],
	primaryContainer: ['a1', 90, 30],
	onPrimaryContainer: ['a1', 10, 90],
	secondary: ['a2', 40, 80],
	onSecondary: ['a2', 100, 20],
	secondaryContainer: ['a2', 90, 30],
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
} as const satisfies ColorTokensInput

export const DEFAULT_THEME_ARGB = /*#__PURE__*/ argbFromHex('#ffdcc4')

type Rgb = [r: number, g: number, b: number]
export type ThemePaletteRgb = Record<keyof typeof COLOR_TOKENS_GENERATION_MAP, Rgb>

const createTonalPalette = (hue: number, chroma: number) => ({
	tone: (tone: number) => Hct.from(hue, chroma, tone).toInt(),
})

interface TonalPalette {
	tone(argb: number): number
}

export const getThemePaletteRgb = (argb: number, isDark: boolean) => {
	const hct = Hct.fromInt(argb)
	const hue = hct.hue
	const chroma = hct.chroma

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

	const entries = Object.entries(COLOR_TOKENS_GENERATION_MAP)
	const transformedEntries = entries.map(([key, value]) => {
		const [toneName, light, dark] = value

		const tone = isDark ? dark : light
		const argbValue = palette[toneName].tone(tone)

		const rgb: Rgb = [redFromArgb(argbValue), greenFromArgb(argbValue), blueFromArgb(argbValue)]

		return [key, rgb] as [string, Rgb]
	})

	return Object.fromEntries(transformedEntries) as ThemePaletteRgb
}

export const clearThemeCssVariables = () => {
	for (const key of Object.keys(COLOR_TOKENS_GENERATION_MAP)) {
		document.documentElement.style.removeProperty(`--color-${key}`)
	}
}

export const setThemeCssVariables = (argb: number, isDark: boolean) => {
	const palette = getThemePaletteRgb(argb, isDark)

	for (const [key, rgb] of Object.entries(palette)) {
		document.documentElement.style.setProperty(`--color-${key}`, rgb.join(' '))
	}
}
