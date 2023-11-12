import { defineConfig, presetUno } from 'unocss'
import { getThemePaletteRgb, DEFAULT_THEME_ARGB } from './src/lib/theme'

const generateThemeVariables = async (isDark: boolean) => {
	const tokens = await getThemePaletteRgb(DEFAULT_THEME_ARGB, isDark)

	const entries = Object.entries(tokens)
	const variablesEntries = entries.map(([name]) => [name, `rgb(var(--color-${name}))`])

	const rootDefinition = entries.map(([name, value]) => `--color-${name}: ${value.join(' ')};`).join('\n')

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
		shortcuts: {
			'wh-full': 'w-full h-full',
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
			'tonal-elevation-1': 'bg-gradient-to-r from-primary/5 to-primary/5',
			'tonal-elevation-2': 'bg-gradient-to-r from-primary/8 to-primary/8',
			'tonal-elevation-3': 'bg-gradient-to-r from-primary/11 to-primary/11',
			'tonal-elevation-4': 'bg-gradient-to-r from-primary/12 to-primary/12',
			link: 'text-primary underline',
			card: 'tonal-elevation-1 flex flex-col rounded-8px bg-surface text-onSurface',
			interactable:
				'relative overflow-hidden appearance-none border-none outline-none decoration-none cursor-pointer flex items-center z-0',
			'base-button': 'interactable text-label-lg h-40px justify-center gap-8px rounded-20px',
			'flip-x': '-scale-x-100',
			'flip-y': '-scale-y-100',
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
