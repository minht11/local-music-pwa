const colors = require('./generated-tw-colors.cjs')

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		colors: {
			transparent: 'transparent',
			current: 'currentColor',
			...colors,
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
			24: '24px',
			32: '32px',
		},
	},
}
