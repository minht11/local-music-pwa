import type { ImageRecord } from '$lib/library/types.ts'
import { getPrimaryColor, SMALL_ARTWORK_IMAGE_WIDTH } from './image-primary-color.ts'

/**
 * Builds a content-addressed {@link ImageRecord} from the original artwork
 * bytes. `hash` must be the SHA-256 hex of `imageBlob` (see `sha256Hex`); the
 * output is deterministic per content
 * @public
 */
export const createImageRecord = async (imageBlob: Blob, hash: string): Promise<ImageRecord> => {
	let bitmap: ImageBitmap | undefined
	try {
		bitmap = await createImageBitmap(imageBlob, {
			// Browser will keep aspect ratio. Most artworks are squares
			// and cases where ratios are extremely different should be rare.
			resizeWidth: SMALL_ARTWORK_IMAGE_WIDTH,
			resizeQuality: 'medium',
		})

		const width = bitmap.width
		const height = bitmap.height

		const canvas = new OffscreenCanvas(width, height)
		const ctx = canvas.getContext('2d', { willReadFrequently: true })
		invariant(ctx)

		ctx.drawImage(bitmap, 0, 0)

		const data = ctx.getImageData(0, 0, width, height).data

		const primaryColor = getPrimaryColor(data, width, height)

		return {
			hash,
			optimized: true,
			full: imageBlob,
			small: await canvas.convertToBlob({
				type: 'image/webp',
			}),
			primaryColor,
		}
	} catch (err) {
		console.error('Failed to optimize artwork', err)

		return {
			hash,
			optimized: false,
			full: imageBlob,
			small: imageBlob,
			primaryColor: undefined,
		}
	} finally {
		bitmap?.close()
	}
}
