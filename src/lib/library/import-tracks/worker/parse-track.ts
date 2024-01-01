import { MusicItemType, type UnknownTrack } from '$lib/db/entities'
// @ts-expect-error - no types
import { Buffer } from 'buffer-lite'
import { parseBuffer as parseMetadata } from 'music-metadata/lib/core'
import invariant from 'tiny-invariant'
import { extractColorFromImage } from './color-from-image'

// Music metadata library uses the Buffer global.
// @ts-ignore
globalThis.Buffer = Buffer

// This limit is a bit arbitrary.
const FILE_SIZE_LIMIT_500MB = 5e8

const getArtwork = async (blob: Blob) => {
	try {
		const smallBitmap = await createImageBitmap(blob, {
			resizeHeight: 100,
			resizeWidth: 100,
		})

		const { width, height } = smallBitmap

		const canvas = new OffscreenCanvas(width, height)
		const ctx = canvas.getContext('bitmaprenderer')

		invariant(ctx, 'Canvas context is null')

		ctx.transferFromImageBitmap(smallBitmap)

		return {
			small: await canvas.convertToBlob(),
			full: blob,
		}
	} catch (err) {
		console.error(err)

		return {
			small: blob,
			full: blob,
		}
	}
}

export const parseTrack = async (
	fileOrHandle: File | FileSystemFileHandle,
): Promise<UnknownTrack | null> => {
	const file = fileOrHandle instanceof File ? fileOrHandle : await fileOrHandle.getFile()

	// Ignore files bigger than 500mb because of
	// potential performance issues.
	if (file.size > FILE_SIZE_LIMIT_500MB) {
		return null
	}

	const fileBuffer = await new Response(file).arrayBuffer()

	const fileUint8 = new Uint8Array(fileBuffer)
	const tags = await parseMetadata(
		fileUint8,
		{ mimeType: file.type, path: file.name, size: file.size },
		{ duration: true },
	)

	const { common } = tags

	let imageBlob: Blob | undefined
	const picture = common.picture?.[0]
	if (picture) {
		const imageData = new Uint8ClampedArray(picture.data)
		imageBlob = new Blob([imageData], { type: picture.type })
	}

	const trackData: UnknownTrack = {
		type: MusicItemType.TRACK,
		name: common.title || file.name,
		album: common.album,
		artists: common.artists || [],
		genre: common.genre || [],
		trackNo: common.track.no || 0,
		trackOf: common.track.of || 0,
		year: common.year?.toString(),
		images: imageBlob && (await getArtwork(imageBlob)),
		duration: tags.format.duration || 0,
		isFavorite: false,
		file: fileOrHandle,
		primaryColor: imageBlob && (await extractColorFromImage(imageBlob)),
	}

	return trackData
}
