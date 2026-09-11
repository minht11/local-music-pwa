import hct from 'color-space/hct.js'
import rgb from 'color-space/rgb.js'
import xyz from 'color-space/xyz.js'

type RgbCoordinates = [r: number, g: number, b: number]
type XyzCoordinates = [x: number, y: number, z: number]
type HctCoordinates = [h: number, c: number, t: number]

// Individual modules register reverse conversions, which their declarations leave unknown.
const rgbToXyz = rgb.xyz as (r: number, g: number, b: number) => XyzCoordinates
const xyzToHct = xyz.hct as (x: number, y: number, z: number) => HctCoordinates

const GAMUT_TOLERANCE = 1e-7
const CHROMA_SEARCH_ITERATIONS = 16

/** @public */
export const hctFromArgb = (argb: number): { h: number; c: number } => {
	const red = (argb >>> 16) & 255
	const green = (argb >>> 8) & 255
	const blue = argb & 255

	const xyzColor = rgbToXyz(red, green, blue)
	const [hue, chroma] = xyzToHct(...xyzColor)

	return { h: hue, c: chroma }
}

const hctToRgb = (hue: number, chroma: number, tone: number): RgbCoordinates => {
	const xyzColor = hct.xyz(hue, chroma, tone) as XyzCoordinates

	return xyz.rgb(...xyzColor) as RgbCoordinates
}

const fitsSrgb = (color: RgbCoordinates): boolean =>
	color.every(
		(channel) =>
			Number.isFinite(channel) &&
			channel >= -GAMUT_TOLERANCE &&
			channel <= 255 + GAMUT_TOLERANCE,
	)

const fitHctToSrgb = (hue: number, chroma: number, tone: number): RgbCoordinates => {
	const requestedColor = hctToRgb(hue, chroma, tone)
	if (fitsSrgb(requestedColor)) {
		return requestedColor
	}

	let fittedColor = hctToRgb(hue, 0, tone)
	if (!fitsSrgb(fittedColor)) {
		throw new RangeError('HCT neutral is outside sRGB')
	}

	let minimumChroma = 0
	let maximumChroma = chroma

	// Preserve hue and tone while finding the highest chroma that fits sRGB.
	for (let i = 0; i < CHROMA_SEARCH_ITERATIONS; i += 1) {
		const candidateChroma = (minimumChroma + maximumChroma) / 2
		const candidateColor = hctToRgb(hue, candidateChroma, tone)
		if (fitsSrgb(candidateColor)) {
			minimumChroma = candidateChroma
			fittedColor = candidateColor
		} else {
			maximumChroma = candidateChroma
		}
	}

	return fittedColor
}

const channelToHex = (channel: number): string => {
	const boundedChannel = Math.max(0, Math.min(255, channel))
	return Math.round(boundedChannel).toString(16).padStart(2, '0')
}

const hexFromHct = (hue: number, chroma: number, tone: number): string => {
	if (tone === 0) {
		return '#000000'
	}

	if (tone === 100) {
		return '#ffffff'
	}

	const color = fitHctToSrgb(hue, chroma, tone)
	return `#${color.map(channelToHex).join('')}`
}

type PaletteFamily =
	| 'a1' /* primary */
	| 'a2' /* secondary */
	| 'a3' /* tertiary */
	| 'n1' /* neutral */
	| 'n2' /* neutral variant */
	| 'error'

type PaletteTokenInput = readonly [family: PaletteFamily, lightTone: number, darkTone: number]

const PALETTE_TOKENS_GENERATION_MAP = {
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
} as const satisfies Record<string, PaletteTokenInput>

/** @public */
export type PaletteToken = keyof typeof PALETTE_TOKENS_GENERATION_MAP

/** @internal */
export const PALETTE_TOKENS_KEYS = Object.keys(PALETTE_TOKENS_GENERATION_MAP) as PaletteToken[]

const PALETTE_TOKENS_GENERATION_ENTRIES = Object.entries(PALETTE_TOKENS_GENERATION_MAP) as [
	PaletteToken,
	PaletteTokenInput,
][]

type ThemeEntry = [key: PaletteToken, hexValue: string]
const HEX_SEED = /^#?[\da-f]{6}$/i

/** @public */
export const argbFromHex = (hex: string): number => {
	if (!HEX_SEED.test(hex)) {
		throw new TypeError('Expected a six-digit hex theme seed')
	}

	const digits = hex.startsWith('#') ? hex.slice(1) : hex
	const rgb = Number.parseInt(digits, 16)

	return (0xff_00_00_00 | rgb) >>> 0
}

/** @public */
export const getThemePaletteRgbEntries = (argb: number, isDark: boolean): ThemeEntry[] => {
	if (!Number.isFinite(argb)) {
		throw new TypeError('Expected a finite theme seed')
	}

	const seed = hctFromArgb(argb)
	const families: Record<PaletteFamily, { h: number; c: number }> = {
		a1: { h: seed.h, c: Math.max(48, seed.c) },
		a2: { h: seed.h, c: 16 },
		a3: { h: (seed.h + 60) % 360, c: 24 },
		n1: { h: seed.h, c: 6 },
		n2: { h: seed.h, c: 8 },
		error: { h: 25, c: 84 },
	}

	return PALETTE_TOKENS_GENERATION_ENTRIES.map(([token, [family, lightTone, darkTone]]) => {
		const palette = families[family]
		const tone = isDark ? darkTone : lightTone

		return [token, hexFromHct(palette.h, palette.c, tone)]
	})
}

const clearThemeCssVariables = (): void => {
	for (const [key] of PALETTE_TOKENS_GENERATION_ENTRIES) {
		document.documentElement.style.removeProperty(`--color-${key}`)
	}
}

const setThemeCssVariables = (argb: number, isDark: boolean): void => {
	const palette = getThemePaletteRgbEntries(argb, isDark)

	for (const [key, hex] of palette) {
		document.documentElement.style.setProperty(`--color-${key}`, hex)
	}
}

/** @public */
export const updateThemeCssVariables = (
	argbOrHex: number | string | null,
	isDark: boolean,
): void => {
	if (argbOrHex === null) {
		clearThemeCssVariables()
		return
	}

	const argb = typeof argbOrHex === 'string' ? argbFromHex(argbOrHex) : argbOrHex
	setThemeCssVariables(argb, isDark)
}
