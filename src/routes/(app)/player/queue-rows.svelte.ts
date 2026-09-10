import type { MenuItem } from '$lib/components/menu/types.ts'
import { TRACK_ROW_HEIGHT } from '$lib/components/tracks/row-height.ts'
import type { SelectionSnapshot, TrackRowIdentity } from '$lib/components/tracks/selection.ts'
import type {
	TrackItemClick,
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

const HEADER_KEYS = {
	manual: 'header:manual',
	source: 'header:source',
} as const satisfies Record<QueueLayer, string>

/**
 * The queue tab's flat row model: the *upcoming* rows of each layer, headed by a
 * section title. The playing track is deliberately absent — the player panel
 * already shows it — so every row here is reorderable, removable, and inactive.
 * Everything resolves by row index against `layout`, so nothing materializes.
 */
export const createQueueRows = (player: QueueTabPlayer) => {
	const layout = $derived.by(() => {
		const sections: QueueSectionLayout[] = []
		let count = 0

		const add = (section: QueueLayer, size: number) => {
			if (size === 0) {
				return
			}

			sections.push({ section, headerIndex: count, count: size })

			count += size + 1
		}

		add('manual', player.queue.count('manual'))
		add('source', player.queue.count('source'))

		// Header positions are the whole reflow signal, and they move without `count`
		// moving: a row crossing between layers shifts the section below it by one.
		const sizeKey = sections.map((s) => s.headerIndex).join(',')

		return { sections, count, sizeKey }
	})

	/** Allocation-free: the size probe below calls it for every index on any `count` change. */
	const sectionAt = (rowIndex: number): QueueSectionLayout | undefined => {
		for (const s of layout.sections) {
			const offset = rowIndex - s.headerIndex
			if (offset >= 0 && offset <= s.count) {
				return s
			}
		}

		return undefined
	}

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

	const trackAt = (rowIndex: number): TrackRowIdentity | undefined => {
		const s = sectionAt(rowIndex)
		if (s === undefined) {
			return undefined
		}

		const index = rowIndex - s.headerIndex - 1
		if (index === -1) {
			return undefined
		}

		const { entryId, trackId } = entryAt(s.section, index)

		return { entryId, trackId }
	}

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

	/** Only for rendered header rows, keeping i18n out of the size probe. */
	const headerAt = (rowIndex: number): QueueHeaderData => {
		const s = sectionAt(rowIndex)
		invariant(s !== undefined && s.headerIndex === rowIndex, 'queue row index is not a header')

		return headerData(s.section)
	}

	// Ids are captured in the closure, so a queue advancing under an open menu still
	// removes the rows it was opened on. The store ignores stale ids.
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

	const onItemClick = ({ entryId }: TrackItemClick): void => {
		player.playQueueEntry(entryId)
	}

	/**
	 * Maps a drop slot in the flat list to an insertion gap within a layer. The seam
	 * between two layers is the end of the one above; the one below starts a gap
	 * further down, so both stay reachable.
	 */
	const dropSlotFor = (insertSlot: number): QueueSlot | null => {
		for (const { section, headerIndex, count } of layout.sections) {
			if (insertSlot <= headerIndex + count + 1) {
				return { layer: section, slot: Math.max(0, insertSlot - headerIndex - 1) }
			}
		}

		return null
	}

	const onDrop = (entryId: number, insertSlot: number): void => {
		const toSlot = dropSlotFor(insertSlot)
		if (toSlot) {
			player.queue.moveEntry(entryId, toSlot)
		}
	}

	const source: TrackListSource = {
		get count() {
			return layout.count
		},
		trackAt,
		size,
		keyAt,
		isRowActive: () => false,
		onItemClick,
	}

	const listProps = {
		source,
		showFavoriteButton: false,
		predefinedMenuItems: { playNext: false, addToQueue: false },
		menuItems: trackMenuItems,
		multiSelectMenuItems,
		onDrop,
	} satisfies Omit<TracksListContainerProps, 'customRow'>

	return {
		headerAt,
		/** No upcoming rows. Unlike `queue.isEmpty`, a track may still be playing. */
		get isEmpty() {
			return layout.count === 0
		},
		listProps,
	}
}
