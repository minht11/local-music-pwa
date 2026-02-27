import { writeFileSync } from 'node:fs'
import {
	argbFromHex,
	// biome-ignore lint/style/noRestrictedImports: Used for static theme generation
} from '@material/material-color-utilities'
import { getThemePaletteRgbEntries } from '../src/lib/theme.ts'

const defaultColorSeed = '#cc9724'
const outputFile = `${import.meta.dirname}/../src/theme-colors.css`

const argb = argbFromHex(defaultColorSeed)

const tokensLightEntries = getThemePaletteRgbEntries(argb, false)
const tokensDark = Object.fromEntries(getThemePaletteRgbEntries(argb, true))

const variables = tokensLightEntries
	.map(([name, lightValue]) => `--color-${name}: light-dark(${lightValue}, ${tokensDark[name]});`)
	.join('\n	')

const content = `/* This file is auto generated, do not edit manually. */
@theme {
	--color-*: initial;
	--color-transparent: transparent;
	--color-current: currentColor;
	${variables}
}
`

writeFileSync(outputFile, content, {
	encoding: 'utf-8',
})
