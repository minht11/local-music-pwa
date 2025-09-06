import type { Handle } from '@sveltejs/kit'
import { ICON_PATHS } from '$lib/components/icon/icon-paths.server.ts'
import { PUBLIC_FALLBACK_PAGE } from '$env/static/public'
import { THEME_PALLETTE_DARK, THEME_PALLETTE_LIGHT } from './server/theme-colors.ts'

const getThemeColorMeta = (color: string | undefined, theme: 'dark' | 'light') =>
	`<meta name="theme-color" content="${color}" media="(prefers-color-scheme: ${theme})" />`

const replaceThemeColorMeta = (html: string) =>
	html.replace(
		'%snae.theme-color-meta%',
		`
		${getThemeColorMeta(THEME_PALLETTE_LIGHT.surface, 'light')}
		${getThemeColorMeta(THEME_PALLETTE_DARK.surface, 'dark')}
		`,
	)

const getSvgSymbol = (name: string, path: string) =>
	`<symbol id="system-icon-${name}">
		<path d="${path}" />
	</symbol>`

const replaceSvgIconPaths = (html: string) => {
	const icons = Object.entries(ICON_PATHS)

	// Instead of keeping the icons paths in the client js bundle, we can inline them in the html
	// making loading tiny bit faster
	return html.replace(
		'%snae.svg-icons-paths%',
		`
		<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="display: none;">
			<defs>
				${icons.map(([name, path]) => getSvgSymbol(name, path)).join('')}
			</defs>
		</svg>`,
	)
}

const transformPageChunk = ({ html }: { html: string }) => {
	html = replaceSvgIconPaths(html)
	html = replaceThemeColorMeta(html)

	return html
}

export const handle: Handle = async ({ event, resolve }) => {
	// This will only run in dev/preview or build and not in production
	// since this we are using static adapter

	// https://svelte.dev/docs/cli/devtools-json
	if (event.url.pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
		return new Response(undefined, { status: 404 })
	}

	// Adding this so service-worker can properly cache the 200.html
	if (event.url.pathname === PUBLIC_FALLBACK_PAGE) {
		const response = await resolve(event, { transformPageChunk })

		return new Response(response.body, {
			status: 200,
			headers: response.headers,
		})
	}

	return resolve(event, { transformPageChunk })
}
