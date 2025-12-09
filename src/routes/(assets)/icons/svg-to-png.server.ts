import { Resvg } from '@resvg/resvg-js'

export const svgToPngResponse = (svg: string, width: number) => {
	const resvg = new Resvg(svg, {
		background: 'transparent',
		fitTo: {
			mode: 'width',
			value: width,
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
