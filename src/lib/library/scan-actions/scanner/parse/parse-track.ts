import { parseBuffer } from 'music-metadata'
import { type ParsedTrackData, UNKNOWN_ITEM } from '$lib/library/types.ts'

// This limit is a bit arbitrary.
const FILE_SIZE_LIMIT_300MB = 300 * 1024 * 1024

const artistSeparatorRegex = /,|&/

/** @public */
export const parseTrackMetadata = async (
	file: File,
): Promise<{ data: ParsedTrackData; imageBlob?: Blob } | null> => {
	// Ignore files bigger than limit because of
	// potential performance issues.
	if (file.size > FILE_SIZE_LIMIT_300MB) {
		return null
	}

	// Loading whole file into memory all at once is faster than streaming it,
	// especially on Android where many small FS reads can be very slow.
	const arrayBuffer = await file.arrayBuffer()
	const buffer = new Uint8Array(arrayBuffer)

	const tags = await parseBuffer(
		buffer,
		{
			mimeType: file.type,
			size: file.size,
		},
		{
			duration: true,
			mkvUseIndex: true,
			skipPostHeaders: true,
		},
	)

	const { common } = tags

	let imageBlob: Blob | undefined
	const picture = common.picture?.[0]
	if (picture) {
		const imageData = new Uint8ClampedArray(picture.data)
		imageBlob = new Blob([imageData], { type: picture.format })
	}

	const artists =
		common.artists
			?.flatMap((artist) => artist.split(artistSeparatorRegex))
			.map((artist) => artist.trim()) ?? []

	const trackData: ParsedTrackData = {
		name: common.title || file.name,
		album: common.album ?? UNKNOWN_ITEM,
		artists: artists.length > 0 ? artists : [UNKNOWN_ITEM],
		genre: common.genre || [],
		trackNo: common.track.no ?? 0,
		trackOf: common.track.of ?? 0,
		discNo: common.disk.no ?? 0,
		discOf: common.disk.of ?? 0,
		year: common.year?.toString() ?? UNKNOWN_ITEM,
		duration: tags.format.duration ?? 0,
		language: common.language?.trim(),
	}

	return {
		data: trackData,
		imageBlob,
	}
}
