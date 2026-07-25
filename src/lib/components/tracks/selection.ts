/** `entryId` is the row, `trackId` the payload. */
export interface TrackRowIdentity {
	entryId: number
	trackId: number
}

export interface SelectionSnapshot {
	/** One entry per selected row, so track ids may repeat. */
	rows: readonly TrackRowIdentity[]
}

/**
 * The start of a shift-click range. Carries the entry id alongside the index so a
 * stale anchor can be detected after the list shifts.
 */
export interface SelectionAnchor {
	index: number
	entryId: number
}
