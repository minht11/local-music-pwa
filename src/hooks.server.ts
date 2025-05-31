import { ICON_PATHS } from '$lib/components/icon/icon-paths'
import minifyHtml from '@minify-html/node'
import type { Handle } from '@sveltejs/kit'

const getSvgSymbol = (name: string, path: string) =>
	`<symbol id="system-icon-${name}">
	<path d="${path}" />
</symbol>`

export const handle: Handle = ({ event, resolve }) => {
	return resolve(event, {
		transformPageChunk: ({ html }) => {
			const icons = Object.entries(ICON_PATHS)

			// Instead of keeping the icons paths in the client js bundle, we can inline them in the html
			// making loading tiny bit faster
			const transformedHtml = html.replace(
				'%snae.svg-icons-paths%',
				`
					<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="display: none;">
						<defs>
							${icons.map(([name, path]) => getSvgSymbol(name, path)).join('')}
						</defs>
					</svg>`,
			)

			return minifyHtml.minify(Buffer.from(transformedHtml), {}).toString('utf-8')
		},
	})
}
