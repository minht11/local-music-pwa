import type { ImageRecord } from '$lib/library/types.ts'
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

		return [smallerTarget, Math.floor(smallerTarget * ratio)]
	}

	const ratio = originalWidth / originalHeight

	return [Math.floor(smallerTarget * ratio), smallerTarget]
}

/**
 * Builds a content-addressed {@link ImageRecord} from the original artwork
 * bytes. `id` must be the SHA-256 hex of `imageBlob` (see `sha256Hex`); the
 * output is deterministic per content
 * @public
 */
export const createImageRecord = async (imageBlob: Blob, id: string): Promise<ImageRecord> => {
	let bitmap: ImageBitmap | undefined
	try {
		bitmap = await createImageBitmap(imageBlob)
		const [tw, th] = getSmallImageDimensions(bitmap.width, bitmap.height)

		const canvas = new OffscreenCanvas(tw, th)
		const ctx = canvas.getContext('2d')
		invariant(ctx)

		// Draw smaller image version
		ctx.drawImage(bitmap, 0, 0, tw, th)

		const data = ctx.getImageData(0, 0, tw, th).data

		const primaryColor = getPrimaryColor(data, tw, th)

		return {
			id,
			optimized: true,
			full: imageBlob,
			small: await canvas.convertToBlob({
				type: 'image/webp',
				quality: 0.7,
			}),
			primaryColor,
		}
	} catch (err) {
		console.error('Failed to optimize artwork', err)

		return {
			id,
			optimized: false,
			full: imageBlob,
			small: imageBlob,
			primaryColor: undefined,
		}
	} finally {
		bitmap?.close()
	}
}
