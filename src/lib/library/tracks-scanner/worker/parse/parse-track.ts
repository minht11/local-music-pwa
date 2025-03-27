import type { ParsedTrackData } from '$lib/db/database-types.ts'
import { parseBlob } from 'music-metadata'
import { getArtworkRelatedData } from './format-artwork.ts'

// This limit is a bit arbitrary.
const FILE_SIZE_LIMIT_500MB = 5e8

export const parseTrack = async (file: File): Promise<ParsedTrackData | null> => {
	// Ignore files bigger than 500mb because of
	// potential performance issues.
	if (file.size > FILE_SIZE_LIMIT_500MB) {
		return null
	}

	const tags = await parseBlob(file, {
		duration: true,
	})

	const { common } = tags

	let imageBlob: Blob | undefined
	const picture = common.picture?.[0]
	if (picture) {
		const imageData = new Uint8ClampedArray(picture.data)
		imageBlob = new Blob([imageData], { type: picture.type })
	}

	const artworkData = imageBlob && (await getArtworkRelatedData(imageBlob))
	const artists = common.artists
		?.flatMap((artist) => artist.split(/,|&/))
		.map((artist) => artist.trim())

	const trackData: ParsedTrackData = {
		name: common.title || file.name,
		album: common.album,
		artists: artists ?? [],
		genre: common.genre || [],
		trackNo: common.track.no || 0,
		trackOf: common.track.of || 0,
		year: common.year?.toString(),
		duration: tags.format.duration || 0,
		...artworkData,
	}

	return trackData
}
