import { canDecodeAudio } from 'mediabunny'
import type { TrackData } from '$lib/library/get/value-queries.ts'

let _flacDecodable: boolean | null = null

if (typeof AudioDecoder !== 'undefined') {
	canDecodeAudio('flac')
		.then((ok) => {
			_flacDecodable = ok
		})
		.catch(() => {
			_flacDecodable = false
		}).finally(() => {
			console.log('FLAC decodability check result:', _flacDecodable)
		})
}

export const isGaplessSupported = (): boolean => {
	if (_flacDecodable !== null) {
		return _flacDecodable
	}
	return 'AudioDecoder' in globalThis
}

const SUPPORTED_CODECS = new Set(['FLAC'])

export const canTrackUseGapless = (track: TrackData): boolean =>
	isGaplessSupported() &&
	(track.metadataVersion ?? 0) >= 1 &&
	track.format?.codec != null &&
	track.duration > 0 &&
	SUPPORTED_CODECS.has(track.format.codec)
