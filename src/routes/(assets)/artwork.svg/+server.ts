import { ICON_PATHS } from '$lib/components/icon/icon-paths'
import { THEME_PALLETTE_DARK } from '../../../server/theme-colors.ts'

const artwork = `
<svg
	xmlns="http://www.w3.org/2000/svg"
	role="presentation"
	width="512"
	height="512"
	viewBox="0 0 24 24"
>
	<rect width="100%" height="100%" fill="${THEME_PALLETTE_DARK.surfaceContainerHighest}" />
	<path
		d="${ICON_PATHS.musicNote}"
		fill="${THEME_PALLETTE_DARK.onSurfaceVariant}"
		style="transform: scale(0.7); transform-origin: center;"
	/>
</svg>
`

export const prerender = true

export const GET = () => {
	return new Response(artwork, {
		headers: {
			'Content-Type': 'image/svg+xml',
		},
	})
}
