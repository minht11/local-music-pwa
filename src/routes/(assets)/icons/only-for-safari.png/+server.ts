import { Resvg } from '@resvg/resvg-js'
import type { RequestHandler } from './$types'

export const prerender = true

export const GET: RequestHandler = async ({ fetch }) => {
	const response = await fetch('/icons/responsive.svg')
	const svg = await response.text()

	const resvg = new Resvg(svg, {
		background: 'transparent',
		fitTo: {
			mode: 'width',
			value: 16,
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
