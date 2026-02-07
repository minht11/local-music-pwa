import { isSafari as isSafariCheck } from '$lib/helpers/utils/ua.ts'
import { getPrimaryColor } from './image-primary-color.ts'

const getSmallImageDimensions = (
	originalWidth: number,
	originalHeight: number,
): [width: number, height: number] => {
	const smallerTarget = Math.min(originalWidth, originalHeight, 100)

	if (originalWidth === originalHeight) {
		return [smallerTarget, smallerTarget]
	}

	if (originalWidth > originalHeight) {
		const ratio = originalHeight / originalWidth

		return [smallerTarget, smallerTarget * ratio]
	}

	const ratio = originalWidth / originalHeight

	return [smallerTarget * ratio, smallerTarget]
}

export type ArtworkRelatedData = {
	image: {
		optimized: boolean
		full: Blob
		small: Blob
	}
	primaryColor: number | undefined
}

const isSafari = isSafariCheck()

export const getArtworkRelatedData = async (imageBlob: Blob): Promise<ArtworkRelatedData> => {
	let bitmap: ImageBitmap | undefined
	try {
		bitmap = await createImageBitmap(imageBlob)
		const [tw, th] = getSmallImageDimensions(bitmap.width, bitmap.height)

		const canvas = new OffscreenCanvas(tw, th)
		const ctx = canvas.getContext('2d')
		invariant(ctx)
		ctx.imageSmoothingEnabled = false

		// Draw smaller image version
		ctx.drawImage(bitmap, 0, 0, tw, th)

		const data = ctx.getImageData(0, 0, tw, th).data

		const primaryColor = getPrimaryColor(data, tw, th)

		return {
			image: {
				optimized: true,
				full: imageBlob,
				small: await canvas.convertToBlob({
					type: isSafari ? 'image/png' : 'image/webp',
					quality: 0.7,
				}),
			},
			primaryColor,
		}
	} catch (err) {
		console.error('Failed to optimize artwork', err)

		return {
			image: {
				optimized: false,
				full: imageBlob,
				small: imageBlob,
			},
			primaryColor: undefined,
		}
	} finally {
		bitmap?.close()
	}
}
