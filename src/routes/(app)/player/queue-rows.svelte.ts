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
import type { QueueLayer, QueueSlot, QueueView } from '$lib/stores/player/queue.svelte.ts'

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

// `index` is the position within the section; -1 is the section's header row.
interface QueuePosition {
	section: QueueSection
	index: number
}

const QUEUE_HEADER_HEIGHT = 48

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

	const positionAt = (rowIndex: number): QueuePosition | null => {
		for (const s of layout.sections) {
			const offset = rowIndex - s.headerIndex
			if (offset >= 0 && offset <= s.count) {
				return { section: s.section, index: offset - 1 }
			}
		}

		return null
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
		const position = positionAt(rowIndex)
		invariant(position, 'queue row index out of range')

		if (position.index === -1) {
			return {
				type: 'custom',
				key: `header:${position.section}`,
				size: QUEUE_HEADER_HEIGHT,
			}
		}

		if (position.section === 'nowPlaying') {
			const current = player.queue.current
			invariant(current)
			return { type: 'track', entryId: current.entryId, trackId: current.trackId }
		}

		const item = player.queue.itemAt(position.section, position.index)
		invariant(item !== undefined)
		return { type: 'track', entryId: item.entryId, trackId: item.trackId }
	}

	/**
	 * virtual-core re-runs the size probe for every index whenever `count` changes,
	 * and every queue advance changes `count` — so at queue scale this has to stay
	 * allocation-free, which going through `positionAt`/`rowAt` would not be.
	 */
	const sizeAt = (rowIndex: number): number => {
		for (const s of layout.sections) {
			if (s.headerIndex === rowIndex) {
				return QUEUE_HEADER_HEIGHT
			}
		}

		return TRACK_ROW_HEIGHT
	}

	/** Called only for rendered header rows, keeping i18n out of the size/key probes. */
	const headerAt = (rowIndex: number): QueueHeaderData => {
		const position = positionAt(rowIndex)
		invariant(position && position.index === -1)
		return headerData(position.section)
	}

	const isReorderable = (rowIndex: number): boolean =>
		positionAt(rowIndex)?.section !== 'nowPlaying'

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
		const from = positionAt(index)
		if (from === null || from.section === 'nowPlaying') {
			return
		}

		const toSlot = dropSlotFor(insertSlot, from.section)
		if (toSlot) {
			player.queue.moveEntry(entryId, toSlot)
		}
	}

	return {
		headerAt,
		/** Props for `TracksListContainer`, minus the `customRow` snippet only markup can supply. */
		get listProps() {
			return {
				count: layout.count,
				rowAt,
				sizeAt,
				trackCount: layout.trackCount,
				// By entry id: the same track can sit on several rows, and only the one
				// actually playing should light up.
				activeRow: { by: 'entryId', entryId: player.queue.current?.entryId ?? null },
				showFavoriteButton: false,
				showReorderButton: isReorderable,
				predefinedMenuItems: { disablePlayNext: true, disableAddToQueue: true },
				menuItems: trackMenuItems,
				multiSelectMenuItems,
				onItemClick,
				onDrop,
			} satisfies Omit<TracksListContainerProps, 'customRow'>
		},
	}
}
