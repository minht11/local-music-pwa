import type { PaletteToken } from '$lib/theme.ts'
import themeCss from '../../.generated/theme-colors.css?raw'

/** @public */
export const THEME_PALLETTE_LIGHT = {} as Record<PaletteToken, string>

/** @public */
export const THEME_PALLETTE_DARK = {} as Record<PaletteToken, string>

const regex =
	/--color-([a-zA-Z0-9-]+):\s*light-dark\(\s*(#[a-fA-F0-9]{3,6})\s*,\s*(#[a-fA-F0-9]{3,6})\s*\)/g

let match: RegExpExecArray | null
// biome-ignore lint/suspicious/noAssignInExpressions: extracting colors from CSS
while ((match = regex.exec(themeCss)) !== null) {
	const colorName = match[1] as PaletteToken
	const lightColor = match[2]
	const darkColor = match[3]

	invariant(lightColor && darkColor, `Invalid color definition for ${colorName}`)

	THEME_PALLETTE_LIGHT[colorName] = lightColor
	THEME_PALLETTE_DARK[colorName] = darkColor
}
