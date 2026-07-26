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
let togglePlay!: ReturnType<typeof vi.fn<() => void>>
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

/** Now playing 1, manual [8, 9], upcoming source [2, 3] — all three sections present. */
const seedAllSections = () => {
	queue.setSource([1, 2, 3], 0)
	queue.enqueue([8, 9], 'next')
}

beforeEach(() => {
	cleanup = $effect.root(() => {
		queue = new QueueStore()
		playQueueEntry = vi.fn<(entryId: number) => void>()
		togglePlay = vi.fn<() => void>()
		rows = createQueueRows({ queue, playQueueEntry, togglePlay } satisfies QueueTabPlayer)
	})
})

afterEach(() => {
	cleanup()
	vi.clearAllMocks()
})

describe('queue rows layout', () => {
	it('lays out present sections as header plus tracks, in order', () => {
		seedAllSections()

		expect(rows.listProps.source.count).toBe(8)
		expect(rows.listProps.source.trackCount).toBe(5)

		expect(headerKeyAt(0)).toBe('header:nowPlaying')
		expect(trackRowAt(1).trackId).toBe(1)
		expect(headerKeyAt(2)).toBe('header:manual')
		expect(trackRowAt(3).trackId).toBe(8)
		expect(trackRowAt(4).trackId).toBe(9)
		expect(headerKeyAt(5)).toBe('header:source')
		expect(trackRowAt(6).trackId).toBe(2)
		expect(trackRowAt(7).trackId).toBe(3)
	})

	it('skips empty sections', () => {
		queue.setSource([1, 2, 3], 0)

		// No manual section: source follows now-playing directly.
		expect(rows.listProps.source.count).toBe(5)
		expect(headerKeyAt(0)).toBe('header:nowPlaying')
		expect(headerKeyAt(2)).toBe('header:source')
		expect(trackRowAt(3).trackId).toBe(2)
	})

	it('rows carry the store entry ids', () => {
		seedAllSections()

		expect(trackRowAt(1).entryId).toBe(queue.current?.entryId)
		expect(trackRowAt(3).entryId).toBe(queue.itemAt('manual', 0)?.entryId)
		expect(trackRowAt(6).entryId).toBe(queue.itemAt('source', 0)?.entryId)
		expect(rows.listProps.source.isRowActive(trackRowAt(1))).toBe(true)
		expect(rows.listProps.source.isRowActive(trackRowAt(3))).toBe(false)
	})

	it('throws for an out-of-range row index', () => {
		seedAllSections()

		expect(() => rows.listProps.source.rowAt(8)).toThrow()
	})

	it('marks only the now-playing row as non-reorderable', () => {
		seedAllSections()

		expect(rows.listProps.showReorderButton(1)).toBe(false)
		expect(rows.listProps.showReorderButton(3)).toBe(true)
		expect(rows.listProps.showReorderButton(6)).toBe(true)
	})
})

describe('row heights', () => {
	it('changes when a cross-layer move shifts a header, even though count does not', () => {
		// Now playing 1, manual [8, 9], source [2, 3] — headers at 0, 2, 5.
		seedAllSections()

		const countBefore = rows.listProps.source.count
		const sizeKeyBefore = sizeKey()
		const headerIndexBefore = rows.listProps.source.rowAt(5)

		expect(headerIndexBefore.type).toBe('custom')

		// Drag the first upcoming source row into the manual layer.
		const moved = queue.itemAt('source', 0)?.entryId
		invariant(moved !== undefined)
		queue.moveEntry(moved, { layer: 'manual', slot: 2 })

		// The row total is unchanged, so `count` alone cannot trigger a reflow...
		expect(rows.listProps.source.count).toBe(countBefore)
		// ...but index 5 is a track row now and the header moved down one.
		expect(rows.listProps.source.rowAt(5).type).toBe('track')
		expect(rows.listProps.source.rowAt(6).type).toBe('custom')

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

describe('hasEntry', () => {
	const hasEntry = (entryId: number): boolean => rows.listProps.source.hasEntry(entryId)

	it('covers every rendered row, the now-playing one included', () => {
		seedAllSections()

		const trackRows = Array.from({ length: rows.listProps.source.count }, (_, index) =>
			rows.listProps.source.rowAt(index),
		).filter((row) => row.type === 'track')

		expect(trackRows).toHaveLength(5)
		expect(trackRows.map((row) => hasEntry(row.entryId))).not.toContain(false)
	})

	it('reports an unknown entry id as gone', () => {
		seedAllSections()

		expect(hasEntry(999_999)).toBe(false)
	})

	it('drops a removed row and keeps the rest', () => {
		seedAllSections()
		const removed = trackRowAt(3).entryId
		const kept = trackRowAt(4).entryId

		queue.removeEntries([removed])

		expect(hasEntry(removed)).toBe(false)
		expect(hasEntry(kept)).toBe(true)
	})

	it('drops a manual row once it has been consumed', () => {
		seedAllSections()
		const consumed = trackRowAt(3).entryId

		queue.advance()

		// It is now the current row, so it is still live — one more advance retires it.
		expect(hasEntry(consumed)).toBe(true)

		queue.advance()

		expect(hasEntry(consumed)).toBe(false)
	})
})

describe('item clicks', () => {
	it('toggles playback on the now-playing row', () => {
		seedAllSections()
		const row = trackRowAt(1)

		rows.listProps.source.onItemClick({ track: {} as never, index: 1, entryId: row.entryId })

		expect(togglePlay).toHaveBeenCalledOnce()
		expect(playQueueEntry).not.toHaveBeenCalled()
	})

	it('plays any other row by its entry id', () => {
		seedAllSections()
		const row = trackRowAt(4)

		rows.listProps.source.onItemClick({ track: {} as never, index: 4, entryId: row.entryId })

		expect(playQueueEntry).toHaveBeenCalledExactlyOnceWith(row.entryId)
		expect(togglePlay).not.toHaveBeenCalled()
	})
})

describe('drop slot mapping', () => {
	it('a drop past the last row lands at the end of the last layer', () => {
		seedAllSections()

		rows.listProps.onDrop(
			{ index: 3, entryId: trackRowAt(3).entryId },
			rows.listProps.source.count,
		)

		expect(manualIds()).toEqual([9])
		expect(sourceIds()).toEqual([2, 3, 8])
	})

	it('a drop past the last row lands at the end of manual when no source exists', () => {
		// Enqueueing on an idle queue activates the first track: 8 plays, manual is [9, 10].
		queue.enqueue([8, 9, 10], 'last')

		rows.listProps.onDrop(
			{ index: 3, entryId: trackRowAt(3).entryId },
			rows.listProps.source.count,
		)

		expect(manualIds()).toEqual([10, 9])
	})

	it('a drop between two rows of a layer reorders within it', () => {
		seedAllSections()

		// Row 4 is manual track 9; slot 3 is the gap before manual track 8.
		rows.listProps.onDrop({ index: 4, entryId: trackRowAt(4).entryId }, 3)

		expect(manualIds()).toEqual([9, 8])
		expect(sourceIds()).toEqual([2, 3])
	})

	it('a drop between two source rows reorders within the source layer', () => {
		seedAllSections()

		// Row 7 is source track 3; slot 6 is the gap before source track 2.
		rows.listProps.onDrop({ index: 7, entryId: trackRowAt(7).entryId }, 6)

		expect(manualIds()).toEqual([8, 9])
		expect(sourceIds()).toEqual([3, 2])
	})

	it('a drop into the middle of the other layer crosses layers at that gap', () => {
		seedAllSections()

		// Row 3 is manual track 8; slot 7 is the gap between source tracks 2 and 3.
		rows.listProps.onDrop({ index: 3, entryId: trackRowAt(3).entryId }, 7)

		expect(manualIds()).toEqual([9])
		expect(sourceIds()).toEqual([2, 8, 3])
	})

	it('a drop on the source header from the manual layer targets the end of manual', () => {
		seedAllSections()

		rows.listProps.onDrop({ index: 3, entryId: trackRowAt(3).entryId }, 5)

		expect(manualIds()).toEqual([9, 8])
		expect(sourceIds()).toEqual([2, 3])
	})

	it('a drop on the source header from the source layer targets its start', () => {
		seedAllSections()

		rows.listProps.onDrop({ index: 7, entryId: trackRowAt(7).entryId }, 5)

		expect(manualIds()).toEqual([8, 9])
		expect(sourceIds()).toEqual([3, 2])
	})

	it('a drop near the now-playing section snaps to the start of the first layer', () => {
		seedAllSections()

		rows.listProps.onDrop({ index: 6, entryId: trackRowAt(6).entryId }, 1)

		expect(manualIds()).toEqual([2, 8, 9])
		expect(sourceIds()).toEqual([3])
	})

	it('ignores a drop whose entry id is no longer in the queue', () => {
		seedAllSections()

		rows.listProps.onDrop({ index: 3, entryId: 999_999 }, 0)

		expect(manualIds()).toEqual([8, 9])
		expect(sourceIds()).toEqual([2, 3])
	})

	it('ignores a drop dragged from the now-playing row', () => {
		seedAllSections()

		rows.listProps.onDrop({ index: 1, entryId: trackRowAt(1).entryId }, 5)

		expect(manualIds()).toEqual([8, 9])
		expect(sourceIds()).toEqual([2, 3])
	})
})
