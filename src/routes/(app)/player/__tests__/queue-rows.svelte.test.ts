import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueueStore } from '$lib/stores/player/queue.svelte.ts'
import { createQueueRows, type QueueTabPlayer } from '../queue-rows.svelte.ts'

// Prevent BroadcastChannel usage and DB wiring in tests
vi.mock('$lib/db/events.ts', () => ({
	onDatabaseChange: vi.fn(() => () => {}),
	dispatchDatabaseChangedEvent: vi.fn(),
}))

let queue!: QueueStore
let rows!: ReturnType<typeof createQueueRows>
let playQueueEntry!: ReturnType<typeof vi.fn<(entryId: number) => void>>
let cleanup: () => void

const manualIds = (): number[] =>
	Array.from(
		{ length: queue.count('manual') },
		(_, i) => queue.itemAt('manual', i)?.trackId as number,
	)

const sourceIds = (): number[] =>
	Array.from(
		{ length: queue.count('source') },
		(_, i) => queue.itemAt('source', i)?.trackId as number,
	)

const trackRowAt = (index: number) => {
	const row = rows.listProps.source.rowAt(index)
	invariant(row.type === 'track')
	return row
}

const headerKeyAt = (index: number): string | number => {
	const row = rows.listProps.source.rowAt(index)
	invariant(row.type === 'custom')

	return rows.listProps.source.keyAt(index)
}

/** The queue always mixes header and track heights, so its size is never a constant. */
const sizeKey = (): string | number => {
	const { size } = rows.listProps.source
	invariant(typeof size !== 'number')

	return size.key
}

/**
 * Track 1 plays, manual [8, 9], upcoming source [2, 3]. Both sections present, so
 * the rows are: 0 manual header, 1→8, 2→9, 3 source header, 4→2, 5→3.
 */
const seedAllSections = () => {
	queue.setSource([1, 2, 3], 0)
	queue.enqueue([8, 9], 'next')
}

beforeEach(() => {
	cleanup = $effect.root(() => {
		queue = new QueueStore()
		playQueueEntry = vi.fn<(entryId: number) => void>()
		rows = createQueueRows({ queue, playQueueEntry } satisfies QueueTabPlayer)
	})
})

afterEach(() => {
	cleanup()
	vi.clearAllMocks()
})

describe('queue rows layout', () => {
	it('lays out present sections as header plus tracks, in order', () => {
		seedAllSections()

		expect(rows.listProps.source.count).toBe(6)
		expect(rows.listProps.source.trackCount).toBe(4)

		expect(headerKeyAt(0)).toBe('header:manual')
		expect(trackRowAt(1).trackId).toBe(8)
		expect(trackRowAt(2).trackId).toBe(9)
		expect(headerKeyAt(3)).toBe('header:source')
		expect(trackRowAt(4).trackId).toBe(2)
		expect(trackRowAt(5).trackId).toBe(3)
	})

	it('omits the playing track, so no row is ever active', () => {
		seedAllSections()

		const trackIds = Array.from({ length: rows.listProps.source.count }, (_, index) =>
			rows.listProps.source.rowAt(index),
		)
			.filter((row) => row.type === 'track')
			.map((row) => row.trackId)

		// Track 1 is playing, and it is the only source row that is not upcoming.
		expect(trackIds).toEqual([8, 9, 2, 3])
		expect(rows.listProps.source.isRowActive(trackRowAt(1))).toBe(false)
		expect(rows.listProps.source.isRowActive(trackRowAt(4))).toBe(false)
	})

	it('shows nothing while a track plays with an empty queue behind it', () => {
		queue.setSource([1], 0)

		expect(queue.current).not.toBeNull()
		expect(rows.isEmpty).toBe(true)
		expect(rows.listProps.source.count).toBe(0)
	})

	it('skips empty sections', () => {
		queue.setSource([1, 2, 3], 0)

		// No manual section: the source section leads.
		expect(rows.listProps.source.count).toBe(3)
		expect(headerKeyAt(0)).toBe('header:source')
		expect(trackRowAt(1).trackId).toBe(2)
		expect(trackRowAt(2).trackId).toBe(3)
	})

	it('rows carry the store entry ids', () => {
		seedAllSections()

		expect(trackRowAt(1).entryId).toBe(queue.itemAt('manual', 0)?.entryId)
		expect(trackRowAt(4).entryId).toBe(queue.itemAt('source', 0)?.entryId)
	})

	it('throws for an out-of-range row index', () => {
		seedAllSections()

		expect(() => rows.listProps.source.rowAt(6)).toThrow()
	})

	it('makes every row reorderable', () => {
		seedAllSections()

		expect(rows.listProps.showReorderButton(1)).toBe(true)
		expect(rows.listProps.showReorderButton(4)).toBe(true)
	})
})

describe('row heights', () => {
	it('changes when a cross-layer move shifts a header, even though count does not', () => {
		// Headers at 0 and 3.
		seedAllSections()

		const countBefore = rows.listProps.source.count
		const sizeKeyBefore = sizeKey()

		expect(rows.listProps.source.rowAt(3).type).toBe('custom')

		// Drag the first upcoming source row into the manual layer.
		const moved = queue.itemAt('source', 0)?.entryId
		invariant(moved !== undefined)
		queue.moveEntry(moved, { layer: 'manual', slot: 2 })

		// The row total is unchanged, so `count` alone cannot trigger a reflow...
		expect(rows.listProps.source.count).toBe(countBefore)
		// ...but index 3 is a track row now and the header moved down one.
		expect(rows.listProps.source.rowAt(3).type).toBe('track')
		expect(rows.listProps.source.rowAt(4).type).toBe('custom')

		expect(sizeKey()).not.toBe(sizeKeyBefore)
	})

	it('stays put when a reorder leaves every header where it was', () => {
		seedAllSections()

		const sizeKeyBefore = sizeKey()
		const moved = queue.itemAt('manual', 0)?.entryId
		invariant(moved !== undefined)
		queue.moveEntry(moved, { layer: 'manual', slot: 2 })

		expect(sizeKey()).toBe(sizeKeyBefore)
	})
})

describe('row keys', () => {
	/** How `TracksListContainer` derives the live entry ids for the selection prune. */
	const liveKeys = (): Set<string | number> =>
		new Set(
			Array.from({ length: rows.listProps.source.count }, (_, index) =>
				rows.listProps.source.keyAt(index),
			),
		)

	const isLive = (entryId: number): boolean => liveKeys().has(entryId)

	it('gives each track row its entry id and each header a key no entry id can collide with', () => {
		seedAllSections()

		const keys = liveKeys()

		expect(keys.size).toBe(6)
		expect([...keys].filter((key) => typeof key === 'string')).toStrictEqual([
			'header:manual',
			'header:source',
		])
	})

	it('covers every rendered track row', () => {
		seedAllSections()

		const trackRows = Array.from({ length: rows.listProps.source.count }, (_, index) =>
			rows.listProps.source.rowAt(index),
		).filter((row) => row.type === 'track')

		expect(trackRows).toHaveLength(4)
		expect(trackRows.map((row) => isLive(row.entryId))).not.toContain(false)
	})

	it('drops a removed row and keeps the rest', () => {
		seedAllSections()
		const removed = trackRowAt(1).entryId
		const kept = trackRowAt(2).entryId

		queue.removeEntries([removed])

		expect(isLive(removed)).toBe(false)
		expect(isLive(kept)).toBe(true)
	})

	it('drops a row as soon as it starts playing, since it leaves the list', () => {
		seedAllSections()
		const next = trackRowAt(1).entryId

		queue.advance()

		expect(queue.current?.entryId).toBe(next)
		expect(isLive(next)).toBe(false)
	})
})

describe('item clicks', () => {
	it('plays a row by its entry id', () => {
		seedAllSections()
		const row = trackRowAt(2)

		rows.listProps.source.onItemClick({ track: {} as never, index: 2, entryId: row.entryId })

		expect(playQueueEntry).toHaveBeenCalledExactlyOnceWith(row.entryId)
	})
})

describe('drop slot mapping', () => {
	it('a drop past the last row lands at the end of the last layer', () => {
		seedAllSections()

		rows.listProps.onDrop(
			{ index: 1, entryId: trackRowAt(1).entryId },
			rows.listProps.source.count,
		)

		expect(manualIds()).toEqual([9])
		expect(sourceIds()).toEqual([2, 3, 8])
	})

	it('a drop past the last row lands at the end of manual when no source exists', () => {
		// Enqueueing on an idle queue activates the first track: 8 plays, manual is [9, 10].
		queue.enqueue([8, 9, 10], 'last')

		rows.listProps.onDrop(
			{ index: 1, entryId: trackRowAt(1).entryId },
			rows.listProps.source.count,
		)

		expect(manualIds()).toEqual([10, 9])
	})

	it('a drop between two rows of a layer reorders within it', () => {
		seedAllSections()

		// Row 2 is manual track 9; slot 1 is the gap before manual track 8.
		rows.listProps.onDrop({ index: 2, entryId: trackRowAt(2).entryId }, 1)

		expect(manualIds()).toEqual([9, 8])
		expect(sourceIds()).toEqual([2, 3])
	})

	it('a drop between two source rows reorders within the source layer', () => {
		seedAllSections()

		// Row 5 is source track 3; slot 4 is the gap before source track 2.
		rows.listProps.onDrop({ index: 5, entryId: trackRowAt(5).entryId }, 4)

		expect(manualIds()).toEqual([8, 9])
		expect(sourceIds()).toEqual([3, 2])
	})

	it('a drop into the middle of the other layer crosses layers at that gap', () => {
		seedAllSections()

		// Row 1 is manual track 8; slot 5 is the gap between source tracks 2 and 3.
		rows.listProps.onDrop({ index: 1, entryId: trackRowAt(1).entryId }, 5)

		expect(manualIds()).toEqual([9])
		expect(sourceIds()).toEqual([2, 8, 3])
	})

	it('a drop on the source header from the manual layer targets the end of manual', () => {
		seedAllSections()

		rows.listProps.onDrop({ index: 1, entryId: trackRowAt(1).entryId }, 3)

		expect(manualIds()).toEqual([9, 8])
		expect(sourceIds()).toEqual([2, 3])
	})

	it('a drop on the source header from the source layer targets the end of manual', () => {
		seedAllSections()

		rows.listProps.onDrop({ index: 5, entryId: trackRowAt(5).entryId }, 3)

		expect(manualIds()).toEqual([8, 9, 3])
		expect(sourceIds()).toEqual([2])
	})

	it('the start of the source layer stays reachable from either layer', () => {
		seedAllSections()

		rows.listProps.onDrop({ index: 5, entryId: trackRowAt(5).entryId }, 4)

		expect(manualIds()).toEqual([8, 9])
		expect(sourceIds()).toEqual([3, 2])

		rows.listProps.onDrop({ index: 1, entryId: trackRowAt(1).entryId }, 4)

		expect(manualIds()).toEqual([9])
		expect(sourceIds()).toEqual([8, 3, 2])
	})

	it('a drop above the first row lands at the start of the first layer', () => {
		seedAllSections()

		rows.listProps.onDrop({ index: 4, entryId: trackRowAt(4).entryId }, 0)

		expect(manualIds()).toEqual([2, 8, 9])
		expect(sourceIds()).toEqual([3])
	})

	it('ignores a drop whose entry id is no longer in the queue', () => {
		seedAllSections()

		rows.listProps.onDrop({ index: 1, entryId: 999_999 }, 0)

		expect(manualIds()).toEqual([8, 9])
		expect(sourceIds()).toEqual([2, 3])
	})

	it('does not consult the dragged row index', () => {
		seedAllSections()

		rows.listProps.onDrop({ index: 99, entryId: trackRowAt(1).entryId }, 3)

		expect(manualIds()).toEqual([9, 8])
		expect(sourceIds()).toEqual([2, 3])
	})
})
