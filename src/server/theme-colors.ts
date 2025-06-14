import { getThemePaletteRgbEntries, type PaletteToken } from '$lib/theme.ts'
// biome-ignore lint/style/noRestrictedImports: used in server
import { argbFromHex } from '@material/material-color-utilities'

// TODO. Ideally our Vite theme plugin would generate .ts file with these colors
// so we don't need to have two places where colors are defined.
const defaultColorSeed = '#cc9724'
const argb = argbFromHex(defaultColorSeed)

/** @public */
export const THEME_PALLETTE_LIGHT = Object.fromEntries(
	getThemePaletteRgbEntries(argb, false),
) as Record<PaletteToken, string>

/** @public */
export const THEME_PALLETTE_DARK = Object.fromEntries(
	getThemePaletteRgbEntries(argb, true),
) as Record<PaletteToken, string>
