/**
 * A queue row as read surfaces expose it. Reads return the stored records
 * themselves, structurally narrowed to this shape — no per-read allocation.
 */
export interface QueueItem {
	readonly trackId: number
	readonly entryId: number
}

// One counter across both layers, so entry ids never collide: selections and
// removals mix rows from either layer in a single map and a single set.
let nextEntryId = 0
export const mintEntryId = (): number => {
	const entryId = nextEntryId
	nextEntryId += 1

	return entryId
}
