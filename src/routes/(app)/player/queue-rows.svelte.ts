import type { MenuItem } from '$lib/components/menu/types.ts'
import { TRACK_ROW_HEIGHT } from '$lib/components/tracks/row-height.ts'
import type { SelectionSnapshot } from '$lib/components/tracks/selection.ts'
import type {
	TrackItemClick,
	TrackListRow,
	TrackListSource,
	TracksListContainerProps,
} from '$lib/components/tracks/TracksListContainer.svelte'
import type { TrackRowLocator } from '$lib/components/tracks/use-track-menu-items.ts'
import type { VariableRowSize } from '$lib/components/VirtualContainer.svelte'
import type { TrackData } from '$lib/library/get/value.ts'
import type {
	QueueItem,
	QueueLayer,
	QueueSlot,
	QueueView,
} from '$lib/stores/player/queue.svelte.ts'

export interface QueueTabPlayer {
	readonly queue: QueueView
	playQueueEntry: (entryId: number) => void
}

export interface QueueHeaderData {
	title: string
	clearTooltip: string
	onClear: () => void
}

interface QueueSectionLayout {
	readonly section: QueueLayer
	readonly headerIndex: number
	readonly count: number
}

const QUEUE_HEADER_HEIGHT = 48

// Constants, so neither a header's row nor its key is rebuilt on every probe.
const HEADER_ROW: TrackListRow = { type: 'custom' }
const HEADER_KEYS = {
	manual: 'header:manual',
	source: 'header:source',
} as const satisfies Record<QueueLayer, string>

/**
 * The queue tab's flat row model: the *upcoming* rows of each layer, headed by a
 * section title. The playing track is deliberately absent — the player panel
 * already shows it — so every row here is reorderable, removable, and inactive.
 *
 * Section geometry is computed once per queue change into `layout`, and every
 * resolver walks it; a section is present only when non-empty, contributing its
 * header plus its rows. Everything resolves by row index in O(sections), so
 * nothing materializes the list.
 */
export const createQueueRows = (player: QueueTabPlayer) => {
	const layout = $derived.by(() => {
		const sections: QueueSectionLayout[] = []
		let count = 0
		let trackCount = 0

		const add = (section: QueueLayer, size: number) => {
			if (size === 0) {
				return
			}

			sections.push({ section, headerIndex: count, count: size })

			count += size + 1
			trackCount += size
		}

		add('manual', player.queue.count('manual'))
		add('source', player.queue.count('source'))

		// A row's height depends only on whether its index is a header, so the header
		// positions are the whole reflow signal. They move without `count` moving: a
		// row crossing between layers shifts the section below it by one.
		const sizeKey = sections.map((s) => s.headerIndex).join(',')

		return { sections, count, trackCount, sizeKey }
	})

	/**
	 * The section owning `rowIndex`, or undefined. Allocation-free, and the single
	 * scan every resolver below builds on: virtual-core re-runs the size and key
	 * probes for every index whenever `count` changes, and every queue advance
	 * changes `count`.
	 */
	const sectionAt = (rowIndex: number): QueueSectionLayout | undefined => {
		for (const s of layout.sections) {
			const offset = rowIndex - s.headerIndex
			if (offset >= 0 && offset <= s.count) {
				return s
			}
		}

		return undefined
	}

	/** The stored record for a track row. Reads return the records themselves. */
	const entryAt = (section: QueueLayer, index: number): QueueItem => {
		const item = player.queue.itemAt(section, index)
		invariant(item !== undefined)

		return item
	}

	const headerData = (section: QueueLayer): QueueHeaderData => {
		if (section === 'manual') {
			return {
				title: m.playerNextInQueue(),
				clearTooltip: m.playerClearQueue(),
				onClear: () => player.queue.clear('manual'),
			}
		}

		const origin = player.queue.origin
		return {
			title: origin ? m.playerNextFrom({ name: origin.name }) : m.playerNextUp(),
			clearTooltip: m.playerClearUpNext(),
			onClear: () => player.queue.clear('source'),
		}
	}

	const rowAt = (rowIndex: number): TrackListRow => {
		const s = sectionAt(rowIndex)
		invariant(s, 'queue row index out of range')

		const index = rowIndex - s.headerIndex - 1
		if (index === -1) {
			return HEADER_ROW
		}

		const { entryId, trackId } = entryAt(s.section, index)

		return { type: 'track', entryId, trackId }
	}

	/**
	 * Headers are shorter than track rows, so heights vary by index. `key` tracks
	 * the header positions because that is all a height depends on — and they move
	 * without `count` moving, as when a row crosses between layers.
	 */
	const size: VariableRowSize = {
		at: (rowIndex) =>
			sectionAt(rowIndex)?.headerIndex === rowIndex ? QUEUE_HEADER_HEIGHT : TRACK_ROW_HEIGHT,
		get key() {
			return layout.sizeKey
		},
	}

	const keyAt = (rowIndex: number): string | number => {
		const s = sectionAt(rowIndex)
		invariant(s, 'queue row index out of range')

		const index = rowIndex - s.headerIndex - 1

		return index === -1 ? HEADER_KEYS[s.section] : entryAt(s.section, index).entryId
	}

	/** Called only for rendered header rows, keeping i18n out of the size/key probes. */
	const headerAt = (rowIndex: number): QueueHeaderData => {
		const s = sectionAt(rowIndex)
		invariant(s !== undefined && s.headerIndex === rowIndex)

		return headerData(s.section)
	}

	/**
	 * Every entry id the queue currently shows. Derived, so the O(rows) build happens
	 * once per queue change and only when something reads it — nothing does until a
	 * selection is active.
	 */
	const liveEntryIds = $derived.by(() => {
		const ids = new Set<number>()

		for (const { section, count } of layout.sections) {
			for (let i = 0; i < count; i += 1) {
				ids.add(entryAt(section, i).entryId)
			}
		}

		return ids
	})

	/**
	 * The ids are captured in the closure, so a queue that advances while the menu
	 * is open still removes the rows it was opened on; the store never removes the
	 * current entry and ignores stale ids.
	 */
	const removeFromQueueItem = (entryIds: readonly number[]): MenuItem => ({
		label: m.playerRemoveFromQueue(),
		action: () => {
			player.queue.removeEntries(entryIds)
		},
	})

	const trackMenuItems = (_track: TrackData, { entryId }: TrackRowLocator): MenuItem[] => [
		removeFromQueueItem([entryId]),
	]

	const multiSelectMenuItems = (selection: SelectionSnapshot): MenuItem[] => [
		removeFromQueueItem(selection.rows.map((row) => row.entryId)),
	]

	// A stale entry id (the row was consumed or removed) is a store-level no-op.
	const onItemClick = ({ entryId }: TrackItemClick): void => {
		player.playQueueEntry(entryId)
	}

	/**
	 * Maps a drop slot in the flat list to an insertion gap within a layer. The seam
	 * between two layers is the end of the one above; the one below starts a gap
	 * further down, so both stay reachable. Slot 0 clamps into the first layer.
	 */
	const dropSlotFor = (insertSlot: number): QueueSlot | null => {
		for (const { section, headerIndex, count } of layout.sections) {
			if (insertSlot <= headerIndex + count + 1) {
				return { layer: section, slot: Math.max(0, insertSlot - headerIndex - 1) }
			}
		}

		// Sections are contiguous and every row belongs to one, so a slot in
		// 0..count always matches; null only when the queue holds no rows at all.
		return null
	}

	const onDrop = ({ entryId }: TrackRowLocator, insertSlot: number): void => {
		const toSlot = dropSlotFor(insertSlot)
		if (toSlot) {
			player.queue.moveEntry(entryId, toSlot)
		}
	}

	/**
	 * Per-field getters, not one getter returning a fresh object: the container
	 * reads these at access time, so each must re-resolve against `layout`.
	 */
	const source: TrackListSource = {
		get count() {
			return layout.count
		},
		get trackCount() {
			return layout.trackCount
		},
		rowAt,
		size,
		keyAt,
		// The list holds only upcoming rows — the playing track is never one of them,
		// so no row is ever the active one.
		isRowActive: () => false,
		hasEntry: (entryId) => liveEntryIds.has(entryId),
		onItemClick,
	}

	const listProps = {
		source,
		showFavoriteButton: false,
		// Every row is upcoming, so every row can be dragged.
		showReorderButton: (_rowIndex: number) => true,
		predefinedMenuItems: { playNext: false, addToQueue: false },
		menuItems: trackMenuItems,
		multiSelectMenuItems,
		onDrop,
	} satisfies Omit<TracksListContainerProps, 'customRow'>

	return {
		headerAt,
		/**
		 * No upcoming rows. Not the same as `queue.isEmpty`: a track can be playing
		 * with nothing behind it, and the playing track is not a row here.
		 */
		get isEmpty() {
			return layout.count === 0
		},
		/** Props for `TracksListContainer`, minus the `customRow` snippet only markup can supply. */
		listProps,
	}
}
