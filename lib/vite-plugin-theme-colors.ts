import { writeFileSync } from 'node:fs'
import {
	argbFromHex,
	// biome-ignore lint/style/noRestrictedImports: Used for static theme generation
} from '@material/material-color-utilities'
import type { Plugin } from 'vite'
import { getThemePaletteRgbEntries } from '../src/lib/theme.ts'

const generateThemeVariables = (hexColor: string) => {
	const argb = argbFromHex(hexColor)

	const tokensLightEntries = getThemePaletteRgbEntries(argb, false)
	const tokensDark = Object.fromEntries(getThemePaletteRgbEntries(argb, true))

	const variables = tokensLightEntries
		.map(
			([name, lightValue]) =>
				`--color-${name}: light-dark(${lightValue}, ${tokensDark[name]});`,
		)
		.join('\n')

	return variables
}

export interface Options {
	output: string
	/** Hex color seed used when generating default color tokens */
	defaultColorSeed: string
}

/** @public */
export const themeColorsPlugin = (options: Options): Plugin => ({
	name: themeColorsPlugin.name,
	enforce: 'pre',
	async buildStart() {
		const variables = await generateThemeVariables(options.defaultColorSeed)

		const content = `
			@theme {
				--color-*: initial;
				--color-transparent: transparent;
				--color-current: currentColor;
			  ${variables}
			}
		`

		// We generate actual CSS file instead of virtual module
		// so tailwindcss intellisense can properly access it
		writeFileSync(options.output, content, {
			encoding: 'utf-8',
		})
	},
})
