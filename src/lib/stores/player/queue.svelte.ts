import { onDatabaseChange } from '$lib/db/events.ts'
import { ManualQueue } from './manual-queue.svelte.ts'
import type { QueueItem } from './queue-entry.ts'
import { type QueueOrigin, SourceQueue } from './source-queue.svelte.ts'

export type { QueueItem, QueueOrigin }

/**
 * A queue row tagged by its layer. `entryId` is the row's session-scoped
 * identity — stable across reorder, shuffle and the upcoming → current
 * transition, unique across both layers.
 */
export interface QueueEntry extends QueueItem {
	layer: QueueLayer
}

export type QueueLayer = 'manual' | 'source'

/** An insertion gap between upcoming rows in a layer (0..upcoming count). */
export interface QueueSlot {
	layer: QueueLayer
	slot: number
}

/**
 * The queue as UI consumers may touch it: reads, plus mutations that never start
 * audio — everything that can start audio lives on `PlayerStore`. Starting no
 * audio is not the same as never changing what plays: `enqueue` onto an idle
 * queue makes the first added track current.
 */
export interface QueueView {
	readonly current: QueueEntry | null
	readonly origin: QueueOrigin | null
	readonly shuffle: boolean
	readonly isEmpty: boolean
	count: (layer: QueueLayer) => number
	itemAt: (layer: QueueLayer, i: number) => QueueItem | undefined
	toggleShuffle: () => void
	enqueue: (trackIds: readonly number[], position: 'next' | 'last') => void
	removeEntries: (entryIds: readonly number[]) => void
	moveEntry: (entryId: number, toSlot: QueueSlot) => void
	clear: (layer: QueueLayer) => void
}

/**
 * A layer's upcoming rows, addressed layer-relative. Both layers answer these
 * despite storing rows differently (a FIFO vs a window past a cursor), which is
 * what lets `QueueStore` route by layer instead of branching per operation.
 */
interface UpcomingList {
	readonly upcomingCount: number
	upcomingAt: (i: number) => QueueItem | undefined
	upcomingIndexOf: (entryId: number) => number
	insertUpcoming: (item: QueueItem, slot: number) => void
	removeUpcomingAt: (i: number) => void
	clearUpcoming: () => void
}

const toEntry = (layer: QueueLayer, item: QueueItem): QueueEntry => ({
	layer,
	trackId: item.trackId,
	entryId: item.entryId,
})

/**
 * Two-layer playback queue:
 *  - manual - the tracks the user explicitly queued
 *  - source - place where album/playlist/list playback was started from.
 */
export class QueueStore {
	readonly #manual = new ManualQueue()
	readonly #source = new SourceQueue()

	get shuffle(): boolean {
		return this.#source.shuffle
	}

	set shuffle(value: boolean) {
		this.#source.shuffle = value
	}

	get origin(): QueueOrigin | null {
		return this.#source.origin
	}

	count(layer: QueueLayer): number {
		return this.#list(layer).upcomingCount
	}

	/** `i` is layer-relative (0 = first upcoming row). */
	itemAt(layer: QueueLayer, i: number): QueueItem | undefined {
		return this.#list(layer).upcomingAt(i)
	}

	readonly current: QueueEntry | null = $derived.by((): QueueEntry | null => {
		const manual = this.#manual.current

		return manual === undefined ? this.#currentSourceEntry() : toEntry('manual', manual)
	})

	get isEmpty(): boolean {
		return this.#manual.isEmpty && this.#source.length === 0
	}

	constructor() {
		onDatabaseChange((changes) => {
			for (const change of changes) {
				if (change.storeName !== 'tracks' || change.operation !== 'delete') {
					continue
				}

				this.#manual.removeAll(change.key)
				this.#source.removeAll(change.key)
			}
		})
	}

	/** A playing manual track goes with the queue it detoured from; queued ones survive. */
	setSource = (
		ids: readonly number[],
		start: number | 'shuffle',
		origin?: QueueOrigin,
	): QueueEntry | null => {
		this.#manual.releaseCurrent()
		this.#source.setItems(ids, start, origin ?? null)

		return this.#currentSourceEntry()
	}

	advance = (loop = false): QueueEntry | null => {
		const taken = this.#manual.take(0)
		if (taken !== undefined) {
			return toEntry('manual', taken)
		}

		return this.#resumeSource(this.#source.advance(loop))
	}

	peekNext = (loop = false): number | null =>
		this.#manual.upcomingAt(0)?.trackId ?? this.#source.peekNext(loop) ?? null

	/**
	 * Consumed manual tracks are gone, so this navigates the source only; from a
	 * manual track it returns to the source row playback detoured from.
	 */
	stepBack = (loop = false): QueueEntry | null => {
		if (this.#manual.current !== undefined) {
			return this.#resumeSource(this.#source.current !== undefined)
		}

		return this.#resumeSource(this.#source.stepBack(loop))
	}

	toggleShuffle = (): void => {
		this.#source.toggleShuffle()
	}

	enqueue = (trackIds: readonly number[], position: 'next' | 'last'): void => {
		this.#manual.enqueue(trackIds, position)
		this.#activateIfIdle()
	}

	/**
	 * A manual row is consumed through, dropping the rows it skipped; a source row
	 * is jumped to, backward included. Null when the id names no upcoming row.
	 */
	playEntry = (entryId: number): QueueEntry | null => {
		const manualIndex = this.#manual.upcomingIndexOf(entryId)
		if (manualIndex !== -1) {
			const taken = this.#manual.take(manualIndex)

			return taken === undefined ? null : toEntry('manual', taken)
		}

		return this.#resumeSource(this.#source.jumpToEntryId(entryId))
	}

	/**
	 * Jumps to `id` in the source queue, else starts a fresh single-track one. The
	 * manual queue is not consulted — its rows are addressed by entry id.
	 */
	playTrackId = (id: number): QueueEntry | null => {
		const jumped = this.#resumeSource(this.#source.jumpToTrackId(id))

		return jumped ?? this.setSource([id], 0)
	}

	/** Never removes the current entry. */
	removeEntries = (entryIds: readonly number[]): void => {
		const toRemove = new Set(entryIds)

		this.#manual.removeEntries(toRemove)
		this.#source.removeEntries(toRemove)
	}

	/**
	 * Remove then insert, so the destination re-derives whatever it tracks by
	 * position — the manual layer's play-next block stays a contiguous prefix, and
	 * a move into the source layer commits the visible order, dropping shuffle.
	 * A failed locate is a silent no-op: the row was consumed or removed mid-drag.
	 */
	moveEntry = (entryId: number, toSlot: QueueSlot): void => {
		const from = this.#locateMovable(entryId)
		if (from === null) {
			return
		}

		// A slot is the gap before its index, so a downward move within a layer lands
		// one short once the row itself is removed.
		const sameLayer = from.layer === toSlot.layer
		const slot = sameLayer && toSlot.slot > from.index ? toSlot.slot - 1 : toSlot.slot
		if (sameLayer && slot === from.index) {
			return
		}

		const fromList = this.#list(from.layer)
		const item = fromList.upcomingAt(from.index)
		if (item === undefined) {
			return
		}

		fromList.removeUpcomingAt(from.index)
		this.#list(toSlot.layer).insertUpcoming(item, slot)
	}

	/** Drops the layer's upcoming rows; the current track keeps playing. */
	clear = (layer: QueueLayer): void => {
		this.#list(layer).clearUpcoming()
	}

	#list = (layer: QueueLayer): UpcomingList => (layer === 'manual' ? this.#manual : this.#source)

	/** Only upcoming rows move: a played or current source row is rejected, as is an unknown id. */
	#locateMovable = (entryId: number): { layer: QueueLayer; index: number } | null => {
		for (const layer of ['manual', 'source'] as const) {
			const index = this.#list(layer).upcomingIndexOf(entryId)
			if (index !== -1) {
				return { layer, index }
			}
		}

		return null
	}

	#currentSourceEntry = (): QueueEntry | null => {
		const item = this.#source.current

		return item === undefined ? null : toEntry('source', item)
	}

	/** A step that never landed leaves a playing manual track playing. */
	#resumeSource = (landed: boolean): QueueEntry | null => {
		if (!landed) {
			return null
		}

		this.#manual.releaseCurrent()

		return this.#currentSourceEntry()
	}

	/** Advances for the cursor only; `PlayerStore.play` picks the row up on the next press. */
	#activateIfIdle = (): void => {
		if (this.current === null) {
			this.advance(false)
		}
	}
}
