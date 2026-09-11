import { afterEach, describe, expect, it } from 'vitest'
import {
	argbFromHex,
	getThemePaletteRgbEntries,
	PALETTE_TOKENS_KEYS,
	type PaletteToken,
	updateThemeCssVariables,
} from '$lib/theme.ts'

const TEXT_PAIRS = [
	['onPrimary', 'primary'],
	['onSecondary', 'secondary'],
	['onTertiary', 'tertiary'],
	['onError', 'error'],

	['onPrimaryContainer', 'primaryContainer'],
	['onSecondaryContainer', 'secondaryContainer'],
	['onTertiaryContainer', 'tertiaryContainer'],
	['onErrorContainer', 'errorContainer'],

	['onSurface', 'surface'],
	['onSurfaceVariant', 'surfaceVariant'],

	['inverseOnSurface', 'inverseSurface'],
] as const satisfies readonly (readonly [PaletteToken, PaletteToken])[]

/**
 * Small but deliberately varied set:
 *
 * - gamut extremes
 * - neutral colors
 * - low/high luminance
 * - realistic theme seeds
 */
const SNAPSHOT_SEEDS = [
	'#000000',
	'#ffffff',
	'#808080',

	'#ff0000',
	'#00ff00',
	'#0000ff',

	'#00ffff',
	'#ff00ff',
	'#ffff00',

	'#cc9724',
	'#6750a4',
	'#0b57d0',
	'#ff6d00',
] as const

type ThemePalette = Record<PaletteToken, string>

const toPalette = (entries: ReturnType<typeof getThemePaletteRgbEntries>): ThemePalette =>
	Object.fromEntries(entries) as ThemePalette

const PALETTES = SNAPSHOT_SEEDS.map((seed) => {
	const argb = argbFromHex(seed)

	return {
		seed,
		light: toPalette(getThemePaletteRgbEntries(argb, false)),
		dark: toPalette(getThemePaletteRgbEntries(argb, true)),
	}
})

function luminance(hex: string): number {
	const [r = 0, g = 0, b = 0] = [1, 3, 5].map((offset) => {
		const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255

		return channel <= 0.040_45 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
	})

	return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(first: string, second: string): number {
	const a = luminance(first)
	const b = luminance(second)

	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

describe('theme palette generation', () => {
	it.each(PALETTES)('generates a stable palette for $seed', ({ light, dark }) => {
		const tokenEntries = PALETTE_TOKENS_KEYS.map((token) => {
			const entry = [light[token], dark[token]]

			return [token, entry]
		})

		expect(Object.fromEntries(tokenEntries)).toMatchSnapshot()
	})

	it.each(PALETTES)('keeps text readable for $seed', ({ seed, light, dark }) => {
		const cases = [
			['light', light],
			['dark', dark],
		] as const

		for (const [mode, colors] of cases) {
			for (const [foreground, background] of TEXT_PAIRS) {
				expect(
					contrast(colors[foreground], colors[background]),
					`${seed} ${mode} ${foreground} on ${background}`,
				).toBeGreaterThanOrEqual(4.5)
			}
		}
	})
})

describe('theme seed handling', () => {
	it('accepts artwork ARGB and picker hex seeds identically', () => {
		for (const dark of [false, true]) {
			expect(getThemePaletteRgbEntries(0xff_cc_97_24, dark)).toEqual(
				getThemePaletteRgbEntries(argbFromHex('#cc9724'), dark),
			)

			expect(getThemePaletteRgbEntries(0, dark)).toEqual(
				getThemePaletteRgbEntries(argbFromHex('#000000'), dark),
			)
		}
	})

	it('rejects invalid hex seeds', () => {
		expect(() => argbFromHex('')).toThrow()
		expect(() => argbFromHex('#invalid')).toThrow()
		expect(() => argbFromHex('#fff')).toThrow()
		expect(() => argbFromHex('#12345678')).toThrow()
	})

	it('rejects non-finite numeric seeds', () => {
		expect(() => getThemePaletteRgbEntries(Number.NaN, false)).toThrow()
		expect(() => getThemePaletteRgbEntries(Number.POSITIVE_INFINITY, false)).toThrow()
		expect(() => getThemePaletteRgbEntries(Number.NEGATIVE_INFINITY, false)).toThrow()
	})
})

describe('theme CSS variables', () => {
	afterEach(() => {
		updateThemeCssVariables(null, false)
	})

	it('applies a picker hex seed at the public boundary', () => {
		updateThemeCssVariables('#cc9724', true)

		for (const [role, hex] of getThemePaletteRgbEntries(0xff_cc_97_24, true)) {
			expect(document.documentElement.style.getPropertyValue(`--color-${role}`)).toBe(hex)
		}
	})

	it('applies black as a valid seed', () => {
		updateThemeCssVariables(0, false)

		for (const [role, hex] of getThemePaletteRgbEntries(0, false)) {
			expect(document.documentElement.style.getPropertyValue(`--color-${role}`)).toBe(hex)
		}
	})

	it('clears theme overrides on reset', () => {
		updateThemeCssVariables('#cc9724', false)
		updateThemeCssVariables(null, false)

		for (const role of PALETTE_TOKENS_KEYS) {
			expect(document.documentElement.style.getPropertyValue(`--color-${role}`)).toBe('')
		}
	})

	it('replaces an existing theme', () => {
		updateThemeCssVariables('#cc9724', false)
		updateThemeCssVariables('#6750a4', true)

		for (const [role, hex] of getThemePaletteRgbEntries(argbFromHex('#6750a4'), true)) {
			expect(document.documentElement.style.getPropertyValue(`--color-${role}`)).toBe(hex)
		}
	})
})
