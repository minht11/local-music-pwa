import { svgToPngResponse } from '../svg-to-png.server.ts'
import type { RequestHandler } from './$types'

export const prerender = true

// PWA App builder requires a 192x192 PNG icon to work.
// https://github.com/minht11/local-music-pwa/issues/71
export const GET: RequestHandler = async ({ fetch }) => {
	const response = await fetch('/icons/responsive.svg')
	const svg = await response.text()

	return svgToPngResponse(svg, 192)
}
