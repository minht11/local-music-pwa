export interface QueueItem {
	/** The same track id can appear multiple times in queue with different entryIds */
	readonly trackId: number
	/** Unique id for queue item. */
	readonly entryId: number
}

/**
 * A layer's upcoming rows, addressed layer-relative. Both layers answer these
 * despite storing rows differently (a FIFO vs a window past a cursor), which is
 * what lets `QueueStore` route by layer instead of branching per operation.
 */
export interface UpcomingList {
	readonly upcomingCount: number
	upcomingAt: (i: number) => QueueItem | undefined
	upcomingIndexOf: (entryId: number) => number
	insertUpcoming: (item: QueueItem, slot: number) => void
	removeUpcomingAt: (i: number) => void
	clearUpcoming: () => void
}

let nextEntryId = 0
export const mintEntryId = (): number => {
	const entryId = nextEntryId
	nextEntryId += 1

	return entryId
}
