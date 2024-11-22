import { writeFileSync } from 'node:fs'
import type { Plugin } from 'vite'
import { DEFAULT_THEME_ARGB, type ThemePaletteMap, getThemePaletteRgb } from '../src/lib/theme.ts'

const generateThemeVariables = () => {
	const tokensLight = getThemePaletteRgb(DEFAULT_THEME_ARGB, false)
	const tokensDark = getThemePaletteRgb(DEFAULT_THEME_ARGB, true)

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

export const themeColorsPlugin = (options: Options): Plugin => ({
	name: themeColorsPlugin.name,
	enforce: 'pre',
	options() {},
	async buildStart() {
		const variables = await generateThemeVariables()

		const content = `
			@theme inline {
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
