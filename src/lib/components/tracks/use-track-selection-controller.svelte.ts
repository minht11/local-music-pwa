import { isPrimaryModifierKey } from '$lib/helpers/utils/ua.ts'
import { SelectionTracker } from './selection.svelte.ts'

interface SelectionInteractionState {
	hoverRangeEnd: number | null
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
		isShiftActive: false,
	})

	const cancelSelection = () => {
		selection.clear()
		state.hoverRangeEnd = null
	}

	$effect(() => {
		const ac = new AbortController()
		const { signal } = ac

		document.addEventListener(
			'keydown',
			(e: KeyboardEvent) => {
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
			},
			{ signal },
		)

		document.addEventListener(
			'keyup',
			(e: KeyboardEvent) => {
				if (e.key === 'Shift') {
					state.isShiftActive = false
					selection.clearHoverAnchor()
				}
			},
			{ signal },
		)

		return () => ac.abort()
	})

	const isInHoverRange = (index: number) => {
		if (!state.isShiftActive || state.hoverRangeEnd === null) {
			return false
		}

		const anchor = selection.rangeAnchor
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

			if (state.isShiftActive) {
				selection.setHoverAnchor(index)
			}
		}
	}

	const applyShiftClick = (trackId: number, index: number) => {
		if (!selection.selectionEnabled) {
			selection.enterSelectionMode()
		}

		if (selection.rangeAnchor === null) {
			selection.select(trackId, index)
			return
		}

		const allItems = items()
		const min = Math.min(selection.rangeAnchor, index)
		const max = Math.max(selection.rangeAnchor, index)
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

		selection.rangeAnchor = index
	}

	const handleItemClick = ({ event, trackId, index, onClick }: HandleItemClickOptions) => {
		if (isPrimaryModifierKey(event)) {
			event.preventDefault()
			selection.toggle(trackId, index)
			return
		}

		if (event.shiftKey) {
			event.preventDefault()
			applyShiftClick(trackId, index)
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
		isInHoverRange,
		handlePointerEnter,
		handleItemClick,
	}
}
