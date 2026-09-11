import { afterEach, expect, it } from 'vitest'
import {
	argbFromHex,
	getThemePaletteRgbEntries,
	type PaletteToken,
	updateThemeCssVariables,
} from '$lib/theme.ts'
import reference from './fixtures/material-theme.json'

const HEX_COLOR = /^#[\da-f]{6}$/
const TEXT_PAIRS: readonly (readonly [PaletteToken, PaletteToken])[] = [
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
]

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

function sampleSeeds(): string[] {
	const values = new Set<number>()
	for (const r of [0, 1, 16, 64, 128, 192, 239, 254, 255]) {
		for (const g of [0, 1, 16, 64, 128, 192, 239, 254, 255]) {
			for (const b of [0, 1, 16, 64, 128, 192, 239, 254, 255]) {
				values.add((r << 16) | (g << 8) | b)
			}
		}
	}
	for (let gray = 0; gray <= 255; gray += 1) {
		values.add(gray * 0x01_01_01)
	}
	let state = 0x5a_e0_20_26
	for (let i = 0; i < 4096; i += 1) {
		state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0
		values.add(state >>> 8)
	}
	return [...values].map((value) => `#${value.toString(16).padStart(6, '0')}`)
}

// Captured from Material Color Utilities 0.4.0 before replacing the production generator.
it.each(reference)('stays within one RGB step of Material for $seed', ({ seed, light, dark }) => {
	for (const isDark of [false, true]) {
		const expected = isDark ? dark : light
		const actual = getThemePaletteRgbEntries(argbFromHex(seed), isDark)
		expect(actual.map(([role]) => role)).toEqual(Object.keys(expected))
		for (const [role, hex] of actual) {
			for (const offset of [1, 3, 5]) {
				expect(
					Math.abs(
						Number.parseInt(hex.slice(offset, offset + 2), 16) -
							Number.parseInt(expected[role].slice(offset, offset + 2), 16),
					),
					role,
				).toBeLessThanOrEqual(1)
			}
		}
	}
})

it('keeps text readable across 5072 reproducible sRGB seeds in both modes', () => {
	const seeds = sampleSeeds()
	expect(seeds).toHaveLength(5072)
	for (const seed of seeds) {
		for (const dark of [false, true]) {
			const entries = getThemePaletteRgbEntries(argbFromHex(seed), dark)
			const colors = new Map(entries)
			for (const [, hex] of entries) {
				expect(hex).toMatch(HEX_COLOR)
			}
			for (const [foreground, background] of TEXT_PAIRS) {
				const a = colors.get(foreground)
				const b = colors.get(background)
				invariant(a && b, 'Missing text pair')
				expect(contrast(a, b), `${seed} ${dark} ${foreground}`).toBeGreaterThanOrEqual(4.5)
			}
		}
	}
}, 60_000)

afterEach(() => {
	updateThemeCssVariables(null, false)
})

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

it('applies a picker hex seed at the public boundary', () => {
	updateThemeCssVariables('#cc9724', true)
	for (const [role, hex] of getThemePaletteRgbEntries(0xff_cc_97_24, true)) {
		expect(document.documentElement.style.getPropertyValue(`--color-${role}`)).toBe(hex)
	}
})

it('applies black as a valid seed and clears theme overrides on reset', () => {
	updateThemeCssVariables(0, false)
	for (const [role, hex] of getThemePaletteRgbEntries(0, false)) {
		expect(document.documentElement.style.getPropertyValue(`--color-${role}`)).toBe(hex)
	}
	updateThemeCssVariables(null, false)
	for (const [role] of getThemePaletteRgbEntries(0, false)) {
		expect(document.documentElement.style.getPropertyValue(`--color-${role}`)).toBe('')
	}
})

it('rejects invalid theme seeds', () => {
	expect(() => argbFromHex('#invalid')).toThrow()
	expect(() => getThemePaletteRgbEntries(Number.NaN, false)).toThrow()
})
