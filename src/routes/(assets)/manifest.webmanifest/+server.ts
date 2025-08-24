import { THEME_PALLETTE_DARK } from '../../../server/theme-colors.ts'

export const prerender = true

const manifest = {
	short_name: m.appNameShort(),
	name: m.appName(),
	start_url: './library/tracks/',
	scope: '../',
	theme_color: THEME_PALLETTE_DARK.surface,
	background_color: THEME_PALLETTE_DARK.surface,
	display: 'standalone',
	orientation: 'any',
	description: 'Lightweight on device music player right in your browser.',
	icons: [
		{
			src: '/icons/responsive.svg',
			type: 'image/svg+xml',
			sizes: 'any',
			purpose: 'any',
		},
		{
			src: '/icons/maskable.svg',
			type: 'image/svg+xml',
			sizes: 'any',
			purpose: 'maskable',
		},
	],
}

export const GET = () => {
	return new Response(JSON.stringify(manifest), {
		headers: {
			'Content-Type': 'application/manifest+json',
		},
	})
}
