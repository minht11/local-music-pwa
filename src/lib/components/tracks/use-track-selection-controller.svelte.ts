import { isPrimaryModifierKey } from '$lib/helpers/utils/ua.ts'
import { SelectionTracker } from './selection.svelte.ts'

interface SelectionInteractionState {
	hoverRangeEnd: number | null
	hoverRangeAnchor: number | null
	isShiftActive: boolean
}

interface UseTrackSelectionControllerOptions {
	items: () => readonly number[]
}

interface HandleItemClickOptions {
	event: MouseEvent | KeyboardEvent
	trackId: number
	index: number
	onClick: () => void
}

export const useTrackSelectionController = ({ items }: UseTrackSelectionControllerOptions) => {
	const selection = new SelectionTracker()

	const state: SelectionInteractionState = $state({
		hoverRangeEnd: null,
		hoverRangeAnchor: null,
		isShiftActive: false,
	})

	const cancelSelection = () => {
		selection.clear()
		state.hoverRangeEnd = null
		state.hoverRangeAnchor = null
	}

	const handleDocumentKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Shift') {
			state.isShiftActive = true
		}

		if (!selection.selectionEnabled) {
			return
		}

		if (e.key === 'Escape') {
			cancelSelection()
			return
		}

		if (e.key === 'a' && isPrimaryModifierKey(e)) {
			e.preventDefault()
			selection.selectMany(items())
		}
	}

	const handleDocumentKeyUp = (e: KeyboardEvent) => {
		if (e.key === 'Shift') {
			state.isShiftActive = false
			state.hoverRangeAnchor = null
		}
	}

	const isInHoverRange = (index: number) => {
		if (!state.isShiftActive || state.hoverRangeEnd === null) {
			return false
		}

		const anchor = selection.lastSelectedIndex ?? state.hoverRangeAnchor
		if (anchor === null) {
			return false
		}

		const min = Math.min(anchor, state.hoverRangeEnd)
		const max = Math.max(anchor, state.hoverRangeEnd)

		return index >= min && index <= max
	}

	const handlePointerEnter = (index: number) => {
		if (state.isShiftActive || selection.selectionEnabled) {
			state.hoverRangeEnd = index

			if (
				state.isShiftActive &&
				state.hoverRangeAnchor === null &&
				selection.lastSelectedIndex === null
			) {
				state.hoverRangeAnchor = index
			}
		}
	}

	const handleItemClick = ({ event, trackId, index, onClick }: HandleItemClickOptions) => {
		if (isPrimaryModifierKey(event)) {
			event.preventDefault()
			selection.toggle(trackId, index)
			return
		}

		if (event.shiftKey) {
			event.preventDefault()
			if (!selection.selectionEnabled) {
				selection.selectionEnabled = true
			}

			if (selection.lastSelectedIndex === null) {
				selection.select(trackId, index)
				return
			}

			const allItems = items()
			const min = Math.min(selection.lastSelectedIndex, index)
			const max = Math.max(selection.lastSelectedIndex, index)
			const rangeIds: number[] = []

			let allSelected = true
			for (let i = min; i <= max; i += 1) {
				const itemAtIndex = allItems[i]
				if (itemAtIndex === undefined) {
					continue
				}

				rangeIds.push(itemAtIndex)
				if (allSelected && !selection.has(itemAtIndex)) {
					allSelected = false
				}
			}

			if (allSelected) {
				selection.unselectMany(rangeIds)
			} else {
				selection.selectMany(rangeIds)
			}

			selection.lastSelectedIndex = index
			return
		}

		if (selection.selectionEnabled) {
			selection.toggle(trackId, index)
			return
		}

		onClick()
	}

	return {
		get selectionEnabled() {
			return selection.selectionEnabled
		},
		get selectedIds() {
			return selection.selectedIds
		},
		get size() {
			return selection.size
		},
		has: (trackId: number) => selection.has(trackId),
		selectMany: (trackIds: readonly number[]) => selection.selectMany(trackIds),
		toggleSelection: (trackId: number, index: number) => selection.toggle(trackId, index),
		cancelSelection,
		handleDocumentKeyDown,
		handleDocumentKeyUp,
		isInHoverRange,
		handlePointerEnter,
		handleItemClick,
	}
}
