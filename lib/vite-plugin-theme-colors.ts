import { writeFileSync } from 'node:fs'
import type { Plugin } from 'vite'
import { getDefaultThemeArgb, getThemePaletteRgb, type ThemePaletteMap } from '../src/lib/theme.ts'

const generateThemeVariables = () => {
	const argb = getDefaultThemeArgb()

	const tokensLight = getThemePaletteRgb(argb, false)
	const tokensDark = getThemePaletteRgb(argb, true)

	const entries = Object.entries(tokensLight) as [keyof ThemePaletteMap, string][]
	const variables = entries
		.map(
			([name, lightValue]) =>
				`--color-${name}: light-dark(${lightValue}, ${tokensDark[name]});`,
		)
		.join('\n')

	return variables
}

export interface Options {
	output: string
}

/** @public */
export const themeColorsPlugin = (options: Options): Plugin => ({
	name: themeColorsPlugin.name,
	enforce: 'pre',
	options() {},
	async buildStart() {
		const variables = await generateThemeVariables()

		const content = `
			@theme {
				--color-*: initial;
				--color-transparent: transparent;
				--color-current: currentColor;
			  ${variables}
			}
		`

		writeFileSync(options.output, content, {
			encoding: 'utf-8',
		})
	},
})
