import type { MenuItem } from '$lib/components/menu/types.ts'
import { TRACK_ROW_HEIGHT } from '$lib/components/tracks/row-height.ts'
import type { SelectionSnapshot } from '$lib/components/tracks/selection.ts'
import type {
	TrackItemClick,
	TrackListRow,
	TracksListContainerProps,
} from '$lib/components/tracks/TracksListContainer.svelte'
import type { TrackRowLocator } from '$lib/components/tracks/use-track-menu-items.ts'
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
	togglePlay: () => void
}

type QueueSection = 'nowPlaying' | QueueLayer

export interface QueueHeaderData {
	title: string
	clearTooltip?: string
	onClear?: () => void
}

interface QueueSectionLayout {
	readonly section: QueueSection
	readonly headerIndex: number
	readonly count: number
}

/** A section holding reorderable rows — every section except "now playing". */
interface LayerSectionLayout extends QueueSectionLayout {
	readonly section: QueueLayer
}

const QUEUE_HEADER_HEIGHT = 48

// Constant, so the row key of a header is not rebuilt on every probe.
const HEADER_KEYS = {
	nowPlaying: 'header:nowPlaying',
	manual: 'header:manual',
	source: 'header:source',
} as const satisfies Record<QueueSection, string>

/**
 * The queue tab's flat row model. Section geometry is computed once per queue
 * change into `layout`, and every resolver walks it; a section is present only
 * when non-empty, contributing its header plus its rows. Everything resolves by
 * row index in O(sections), so nothing materializes the list.
 */
export const createQueueRows = (player: QueueTabPlayer) => {
	const layout = $derived.by(() => {
		const sections: QueueSectionLayout[] = []
		// The reorderable subset, in order — every drop target comes from here.
		const layers: LayerSectionLayout[] = []
		let count = 0
		let trackCount = 0

		const add = (section: QueueSection, size: number) => {
			if (size === 0) {
				return
			}

			const entry = { section, headerIndex: count, count: size }
			sections.push(entry)
			if (section !== 'nowPlaying') {
				layers.push({ ...entry, section })
			}

			count += size + 1
			trackCount += size
		}

		add('nowPlaying', player.queue.current === null ? 0 : 1)
		add('manual', player.queue.count('manual'))
		add('source', player.queue.count('source'))

		return { sections, layers, count, trackCount }
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
	const entryAt = (section: QueueSection, index: number): QueueItem => {
		if (section === 'nowPlaying') {
			const current = player.queue.current
			invariant(current)

			return current
		}

		const item = player.queue.itemAt(section, index)
		invariant(item !== undefined)

		return item
	}

	const headerData = (section: QueueSection): QueueHeaderData => {
		if (section === 'nowPlaying') {
			return { title: m.playerNowPlaying() }
		}

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
			return { type: 'custom', key: HEADER_KEYS[s.section], size: QUEUE_HEADER_HEIGHT }
		}

		const { entryId, trackId } = entryAt(s.section, index)

		return { type: 'track', entryId, trackId }
	}

	const sizeAt = (rowIndex: number): number =>
		sectionAt(rowIndex)?.headerIndex === rowIndex ? QUEUE_HEADER_HEIGHT : TRACK_ROW_HEIGHT

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

	const isReorderable = (rowIndex: number): boolean =>
		sectionAt(rowIndex)?.section !== 'nowPlaying'

	const isCurrentEntry = (entryId: number): boolean => entryId === player.queue.current?.entryId

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

	const trackMenuItems = (_track: TrackData, { entryId }: TrackRowLocator): MenuItem[] =>
		isCurrentEntry(entryId) ? [] : [removeFromQueueItem([entryId])]

	const multiSelectMenuItems = (selection: SelectionSnapshot): MenuItem[] => [
		removeFromQueueItem(selection.rows.map((row) => row.entryId)),
	]

	const onItemClick = ({ entryId }: TrackItemClick): void => {
		if (isCurrentEntry(entryId)) {
			player.togglePlay()
			return
		}

		// A stale entry id (the row was consumed or removed) is a store-level no-op.
		player.playQueueEntry(entryId)
	}

	/**
	 * Maps a drop slot in the flat list to an insertion gap within a layer. A layer
	 * owns the slots from its header down to the gap after its last row, so adjacent
	 * layers overlap by exactly one: the seam is both "the end of the one above" and
	 * "the start of the one below". Ties go to the dragged row's own layer, so a drop
	 * at a seam never silently changes layer.
	 */
	const dropSlotFor = (insertSlot: number, fromLayer: QueueLayer): QueueSlot | null => {
		let match: QueueSlot | null = null

		for (const { section, headerIndex, count } of layout.layers) {
			if (insertSlot < headerIndex || insertSlot > headerIndex + count + 1) {
				continue
			}

			match = { layer: section, slot: Math.max(0, insertSlot - headerIndex - 1) }
			if (section === fromLayer) {
				return match
			}
		}

		if (match !== null) {
			return match
		}

		// Owned by no layer: the slot sits in the now-playing block, which has no
		// insertion gaps, so snap to the start of the queue.
		const firstLayer = layout.layers[0]

		return firstLayer === undefined ? null : { layer: firstLayer.section, slot: 0 }
	}

	const onDrop = ({ index, entryId }: TrackRowLocator, insertSlot: number): void => {
		// The container only fires while `index` still resolves to the dragged row,
		// so the row's own section answers which layer it came from.
		const from = sectionAt(index)
		if (from === undefined || from.section === 'nowPlaying') {
			return
		}

		const toSlot = dropSlotFor(insertSlot, from.section)
		if (toSlot) {
			player.queue.moveEntry(entryId, toSlot)
		}
	}

	/**
	 * Per-field getters, not one getter returning a fresh object: this is spread
	 * into the container, and Svelte's spread proxy re-resolves the source on every
	 * property read.
	 */
	const listProps = {
		get count() {
			return layout.count
		},
		get trackCount() {
			return layout.trackCount
		},
		rowAt,
		sizeAt,
		keyAt,
		// By entry id: the same track can sit on several rows, and only the one
		// actually playing should light up.
		isRowActive: ({ entryId }) => isCurrentEntry(entryId),
		showFavoriteButton: false,
		showReorderButton: isReorderable,
		predefinedMenuItems: { disablePlayNext: true, disableAddToQueue: true },
		menuItems: trackMenuItems,
		multiSelectMenuItems,
		onItemClick,
		onDrop,
	} satisfies Omit<TracksListContainerProps, 'customRow'>

	return {
		headerAt,
		/** Props for `TracksListContainer`, minus the `customRow` snippet only markup can supply. */
		listProps,
	}
}
