import { QuantizerCelebi, Score, argbFromRgb } from '@material/material-color-utilities'

export const extractColorFromImage = (image: ImageData): number | undefined => {
	try {
		const skipPixels = 2
		const bytesPerPixel = 4
		const increment = bytesPerPixel + bytesPerPixel * skipPixels

		const imageBytes = image.data

		const pixelsLen = Math.round(imageBytes.length / increment)
		// Preallocate array because it is faster
		const pixels = new Array<number>(pixelsLen)

		for (let i = 0, realIndex = 0; i < imageBytes.length; i += increment, realIndex += 1) {
			const r = imageBytes[i] as number
			const g = imageBytes[i + 1] as number
			const b = imageBytes[i + 2] as number
			const a = imageBytes[i + 3] as number
			if (a >= 255) {
				const argb = argbFromRgb(r, g, b)

				pixels[realIndex] = argb
			}
		}

		// Convert Pixels to Material Colors
		const result = QuantizerCelebi.quantize(pixels, 128)
		const ranked = Score.score(result)
		const top = ranked[0]

		return top
	} catch (err) {
		console.error(err)
	}

	return undefined
}
