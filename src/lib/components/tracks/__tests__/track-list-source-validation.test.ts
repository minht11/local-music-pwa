import { describe, expect, it } from 'vitest'
import {
	validateTrackListSourceCounts,
	validateTrackListSourceRow,
	validateTrackListSourceTrackCount,
	validateUniqueTrackListSourceKey,
} from '../track-list-source-validation.ts'

const TRACK_KEY_ERROR = /must equal track entryId 7/
const CUSTOM_KEY_ERROR = /non-number key/
const DUPLICATE_KEY_ERROR = /duplicate key 7/
const TRACK_COUNT_ERROR = /resolving every row found 2 tracks/

describe('TrackListSource development validation', () => {
	it('accepts valid counts', () => {
		expect(() => validateTrackListSourceCounts(3, 2)).not.toThrow()
	})

	it.each([
		[-1, 0],
		[1.5, 1],
		[1, -1],
		[1, 0.5],
		[1, 2],
	])('rejects invalid count=%s and trackCount=%s', (count, trackCount) => {
		expect(() => validateTrackListSourceCounts(count, trackCount)).toThrow()
	})

	it('requires a track key to equal its entry id', () => {
		expect(() => validateTrackListSourceRow(2, { type: 'track', entryId: 7 }, 8)).toThrow(
			TRACK_KEY_ERROR,
		)
	})

	it('requires a custom row key to be non-numeric', () => {
		expect(() => validateTrackListSourceRow(2, { type: 'custom' }, 8)).toThrow(CUSTOM_KEY_ERROR)
	})

	it('rejects duplicate keys during a complete walk', () => {
		expect(() => validateUniqueTrackListSourceKey(2, 7, new Set([7]))).toThrow(
			DUPLICATE_KEY_ERROR,
		)
	})

	it('rejects a trackCount that differs from a complete walk', () => {
		expect(() => validateTrackListSourceTrackCount(3, 2)).toThrow(TRACK_COUNT_ERROR)
	})
})
