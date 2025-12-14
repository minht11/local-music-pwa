import { Resvg } from '@resvg/resvg-js'
import type { EntryGenerator, RequestHandler } from './$types'

export const prerender = true

// Unfortunately a lot of things still require raster icons. Examples:
// - Safari
// - PWA Builder https://github.com/minht11/local-music-pwa/issues/71
// - Google search results
const sizes = [16, 32, 48, 128, 192] as const

export const entries: EntryGenerator = () => {
	return sizes.map((size) => ({ size: size.toString() }))
}

export const GET: RequestHandler = async ({ fetch, params }) => {
	const response = await fetch('/icons/responsive.svg')
	const svg = await response.text()

	const size = Number(params.size)

	const resvg = new Resvg(svg, {
		background: 'transparent',
		fitTo: {
			mode: 'width',
			value: size,
		},
		font: {
			// It will be faster to disable loading system fonts.
			loadSystemFonts: false,
		},
	})
	const pngData = resvg.render()
	const pngBuffer = pngData.asPng().buffer as ArrayBuffer

	return new Response(pngBuffer, {
		headers: {
			'Content-Type': 'image/png',
		},
	})
}
