import type { TrackData } from '$lib/library/get/value-queries.ts'

// Mediabunny's AudioBufferSink requires WebCodecs AudioDecoder internally.
export const isGaplessSupported = (): boolean => 'AudioDecoder' in globalThis

// Only tracks with metadataVersion set and a supported codec are eligible.
// Start with FLAC; extend the set when adding more formats.
const SUPPORTED_CODECS = new Set(['FLAC'])

export const canTrackUseGapless = (track: TrackData): boolean =>
	(track.metadataVersion ?? 0) >= 1 &&
	track.format?.codec != null &&
	SUPPORTED_CODECS.has(track.format.codec)
