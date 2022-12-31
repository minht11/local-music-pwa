const palette = require('./generated-tw-colors.cjs')

const getColorVariables = (dark = false) => {
	const entries = Object.entries(palette).map(([name, value]) => [
		name,
		dark ? value.dark : value.light,
	])

	return Object.fromEntries(entries)
}

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	extend: {
		willChange: {
			bg: 'background',
		},
	},
	theme: {
		extend: {
			screens: {
				xss: '320px',
				xs: '420px',
			},
		},
		colors: {
			transparent: 'transparent',
			current: 'currentColor',
			...Object.fromEntries(
				Object.keys(palette).map((name) => [name, `rgba(var(--colors-${name}), <alpha-value>)`]),
			),
		},
		variables: {
			DEFAULT: {
				colors: {
					...getColorVariables(),
				},
			},
		},
		darkVariables: {
			DEFAULT: {
				colors: {
					...getColorVariables(true),
				},
			},
		},
		spacing: {
			0: '0',
			1: '1px',
			2: '2px',
			4: '4px',
			8: '8px',
			12: '12px',
			16: '16px',
			24: '24px',
			32: '32px',
			36: '36px',
			40: '40px',
			44: '44px',
			48: '48px',
			56: '56px',
			64: '64px',
			72: '72px',
			80: '80px',
			88: '88px',
			96: '96px',
			128: '128px',
		},
		borderRadius: {
			0: '0',
			2: '2px',
			4: '4px',
			8: '8px',
			12: '12px',
			16: '16px',
			20: '20px',
			24: '24px',
			32: '32px',
			full: '9999px',
		},
	},
	plugins: [
		require('@mertasan/tailwindcss-variables')({
			colorVariables: true,
			forceRGB: true,
		}),
	],
}
