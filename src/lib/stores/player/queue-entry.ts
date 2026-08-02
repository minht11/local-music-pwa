export interface QueueItem {
	/** The same track id can appear multiple times in queue with different entryIds */
	readonly trackId: number
	/** Unique id for queue item. */
	readonly entryId: number
}

let nextEntryId = 0
export const mintEntryId = (): number => {
	const entryId = nextEntryId
	nextEntryId += 1

	return entryId
}
