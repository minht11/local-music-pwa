import type { TrackData } from '$lib/library/get/value-queries.ts'

// Mediabunny's AudioBufferSink requires WebCodecs AudioDecoder internally.
export const isGaplessSupported = (): boolean => 'AudioDecoder' in globalThis

const SUPPORTED_CODECS = new Set(['FLAC'])

export const canTrackUseGapless = (track: TrackData): boolean =>
	isGaplessSupported() &&
	(track.metadataVersion ?? 0) >= 1 &&
	track.format?.codec != null &&
	track.duration > 0 &&
	SUPPORTED_CODECS.has(track.format.codec)
