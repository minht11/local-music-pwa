import { presetUno } from '@unocss/preset-uno'
import { defineConfig } from '@unocss/vite'
import { DEFAULT_THEME_ARGB, getThemePaletteRgb } from './src/lib/theme.ts'

const generateThemeVariables = async (isDark: boolean) => {
	const tokens = await getThemePaletteRgb(DEFAULT_THEME_ARGB, isDark)

	const entries = Object.entries(tokens)
	const variablesEntries = entries.map(([name]) => [name, `rgb(var(--color-${name}))`])

	const rootDefinition = entries
		.map(([name, value]) => `--color-${name}: ${value.join(' ')};`)
		.join('\n')

	return {
		variables: Object.fromEntries(variablesEntries),
		rootDefinition,
	}
}

// Using wrapper because https://github.com/unocss/unocss/issues/2720
export default (async () => {
	const [lightColors, darkColors] = await Promise.all([
		generateThemeVariables(false),
		generateThemeVariables(true),
	])

	return defineConfig({
		theme: {
			colors: darkColors.variables,
			easing: {
				outgoing40: 'cubic-bezier(.4, 0, 1, 1)',
				incoming80: 'cubic-bezier(0, 0, .2, 1)',
				incoming80outgoing40: 'cubic-bezier(0.4, 0, 0.2, 1)',
			},
		},
		extendTheme: [
			(theme) => ({
				...theme,
				breakpoints: {
					...theme.breakpoints,
					xss: '320px',
					xs: '420px',
				},
			}),
		],
		rules: [
			[
				'scrollbar-gutter-stable',
				{
					'scrollbar-gutter': 'stable',
				},
			],
		],
		shortcuts: {
			'text-headline-md': 'text-28px leading-36px tracking-0 font-400',
			'text-headline-sm': 'text-24px leading-32px tracking-0 font-400',
			'text-title-lg': 'text-22px leading-28px tracking-0 font-500',
			'text-title-md': 'text-16px leading-24px tracking-0.15px font-500',
			'text-title-sm': 'text-14px leading-20px tracking-0.1px font-500',
			'text-label-lg': 'text-14px leading-20px tracking-0.1px font-500',
			'text-label-md': 'text-12px leading-16px tracking-0.5px font-500',
			'text-label-sm': 'text-11px leading-16px tracking-0.5px font-500',
			'text-body-lg': 'text-16px leading-24px tracking-0.15px font-400',
			'text-body-md': 'text-14px leading-20px tracking-0.25px font-400',
			'text-body-sm': 'text-12px leading-16px tracking-0.4px font-400',
			link: 'text-primary underline',
			card: 'bg-surfaceContainer flex flex-col rounded-8px text-onSurface',
			interactable:
				'relative overflow-hidden appearance-none border-none outline-none decoration-none cursor-pointer flex items-center z-0 focus-visible:ring-2 ring-inset ring-current',
			'base-button': 'interactable text-label-lg h-40px justify-center gap-8px rounded-20px',
			'flip-x': '-scale-x-100',
			'flip-y': '-scale-y-100',
			'virtual-item': 'contain-strict will-change-transform !absolute',
		},
		presets: [
			presetUno({
				dark: 'class',
			}),
		],
		preflights: [
			{
				getCSS: () => `
					:root {
						${lightColors.rootDefinition}
					}
					.dark {
						${darkColors.rootDefinition}
					}

					.interactable::after {
						display: none;
						content: '';
						position: absolute;
						height: 100%;
						width: 100%;
						left: 0;
						top: 0;
						background: currentColor;
						z-index: -1;
						pointer-events: none;
					}

					@media (any-hover: hover) {
						.interactable:hover::after {
							display: block;
							opacity: 0.08;
						}

						.interactable[disabled]::after {
							display: none;
						}
					}

					.interactable:is(:focus-visible),
					.interactable:hover:focus-visible {
						outline: 2px solid rgb(var(--color-onSurface));
						outline-offset: -2px;
					}

					.interactable:focus-visible::after {
						display: block;
						opacity: 0.12;
					}
      `,
			},
		],
	})
})()
