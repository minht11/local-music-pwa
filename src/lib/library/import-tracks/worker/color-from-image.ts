import { QuantizerCelebi, Score, argbFromRgb } from '@material/material-color-utilities'

export const extractColorFromImage = async (image: ImageData): Promise<number | undefined> => {
	try {
		const skipPixels = 1
		const bytesPerPixel = 4
		const increment = bytesPerPixel + bytesPerPixel * skipPixels

		const imageBytes = image.data

		const pixels: number[] = []
		for (let i = 0; i < imageBytes.length; i += increment) {
			const r = imageBytes[i] as number
			const g = imageBytes[i + 1] as number
			const b = imageBytes[i + 2] as number
			const a = imageBytes[i + 3] as number
			if (a >= 255) {
				const argb = argbFromRgb(r, g, b)
				pixels.push(argb)
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
