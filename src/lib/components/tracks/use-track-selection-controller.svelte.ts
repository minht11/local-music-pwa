import { SvelteMap } from 'svelte/reactivity'
import { isPrimaryModifierKey } from '$lib/helpers/utils/ua.ts'
import type { SelectionAnchor, SelectionSnapshot, TrackRowIdentity } from './selection.ts'

interface UseTrackSelectionControllerOptions {
	/** Total row count (track and custom rows alike). */
	rowCount: () => number
	/** Row identity, or undefined for a non-track row (a section header) or a stale index. */
	trackAt: (index: number) => TrackRowIdentity | undefined
	/** Whether an entry id still names a row; O(1), see `TrackListSource.hasEntry`. */
	hasEntry: (entryId: number) => boolean
}

interface HandleItemClickOptions {
	event: MouseEvent | KeyboardEvent
	entryId: number
	trackId: number
	index: number
	onClick: () => void
}

export const useTrackSelectionController = ({
	rowCount,
	trackAt,
	hasEntry,
}: UseTrackSelectionControllerOptions) => {
	// entryId -> trackId, keyed by entry id so rows sharing a track id select
	// independently and a selection can survive list changes.
	const selected = new SvelteMap<number, number>()
	const selectionEnabled = $derived(selected.size > 0)

	// Not reactive: only the next shift interaction reads it. Dropped whenever the
	// selection empties, so a later shift-click cannot range off a stale start.
	let rangeAnchor: SelectionAnchor | null = null

	let hoverRangeEnd = $state<number | null>(null)
	let isShiftActive = $state(false)

	const cancelSelection = () => {
		selected.clear()
		rangeAnchor = null
		hoverRangeEnd = null
	}

	/** Visits every track row in order. Materializes nothing: the list can be huge. */
	const forEachLiveRow = (fn: (row: TrackRowIdentity) => void): void => {
		const count = rowCount()
		for (let index = 0; index < count; index += 1) {
			const row = trackAt(index)
			if (row) {
				fn(row)
			}
		}
	}

	const selectAll = () => {
		forEachLiveRow((row) => selected.set(row.entryId, row.trackId))
	}

	// Any list change while selecting (queue advance, removal, refetch) drops just
	// the entries that are gone; the rest of the selection survives. Costs one
	// `hasEntry` probe per *selected* row, not a walk of the list — which can be
	// the whole library.
	$effect(() => {
		if (!selectionEnabled) {
			return
		}

		// The ids are read untracked — only `hasEntry` should re-trigger this, or the
		// deletions below would re-run it. Selecting more rows needs no prune: a row
		// is live at the moment it is selected.
		const dead = untrack(() => [...selected.keys()]).filter((entryId) => !hasEntry(entryId))

		untrack(() => {
			for (const entryId of dead) {
				selected.delete(entryId)
			}

			if (selected.size === 0) {
				rangeAnchor = null
			}
		})
	})

	$effect(() => {
		const ac = new AbortController()
		const { signal } = ac

		document.addEventListener(
			'keydown',
			(e: KeyboardEvent) => {
				if (e.key === 'Shift') {
					isShiftActive = true
				}

				if (!selectionEnabled) {
					return
				}

				if (e.key === 'Escape') {
					cancelSelection()
					return
				}

				if (e.key === 'a' && isPrimaryModifierKey(e)) {
					e.preventDefault()
					selectAll()
				}
			},
			{ signal },
		)

		document.addEventListener(
			'keyup',
			(e: KeyboardEvent) => {
				if (e.key === 'Shift') {
					isShiftActive = false

					// Shift released with nothing selected: the hover-seeded anchor
					// never committed, so drop it.
					if (!selectionEnabled) {
						rangeAnchor = null
					}
				}
			},
			{ signal },
		)

		return () => ac.abort()
	})

	// The list can shift under the anchor's index, so trust it only while the row
	// there still bears the anchor's entry id.
	const validAnchorIndex = (): number | null => {
		const anchor = rangeAnchor
		if (anchor === null || trackAt(anchor.index)?.entryId !== anchor.entryId) {
			return null
		}

		return anchor.index
	}

	const isInHoverRange = (index: number) => {
		if (!isShiftActive || hoverRangeEnd === null) {
			return false
		}

		const anchor = validAnchorIndex()
		if (anchor === null) {
			return false
		}

		const min = Math.min(anchor, hoverRangeEnd)
		const max = Math.max(anchor, hoverRangeEnd)

		return index >= min && index <= max
	}

	const handlePointerEnter = (index: number) => {
		if (isShiftActive || selectionEnabled) {
			hoverRangeEnd = index

			// A shift-hover seeds the anchor so the eventual shift-click ranges
			// from where the preview started; it never overrides an existing anchor.
			if (isShiftActive && rangeAnchor === null) {
				const row = trackAt(index)
				if (row) {
					rangeAnchor = { index, entryId: row.entryId }
				}
			}
		}
	}

	const toggleSelection = (entryId: number, trackId: number, index: number) => {
		if (selected.has(entryId)) {
			selected.delete(entryId)
		} else {
			selected.set(entryId, trackId)
		}

		rangeAnchor = selected.size > 0 ? { index, entryId } : null
	}

	const applyShiftClick = (entryId: number, trackId: number, index: number) => {
		const anchorIndex = validAnchorIndex()
		if (anchorIndex === null) {
			selected.set(entryId, trackId)
			rangeAnchor = { index, entryId }
			return
		}

		const min = Math.min(anchorIndex, index)
		const max = Math.max(anchorIndex, index)
		const rangeRows: TrackRowIdentity[] = []

		let allSelected = true
		for (let i = min; i <= max; i += 1) {
			const row = trackAt(i)
			if (row === undefined) {
				continue
			}

			rangeRows.push(row)
			if (allSelected && !selected.has(row.entryId)) {
				allSelected = false
			}
		}

		if (allSelected) {
			for (const row of rangeRows) {
				selected.delete(row.entryId)
			}
		} else {
			for (const row of rangeRows) {
				selected.set(row.entryId, row.trackId)
			}
		}

		rangeAnchor = { index, entryId }
	}

	const handleItemClick = ({
		event,
		entryId,
		trackId,
		index,
		onClick,
	}: HandleItemClickOptions) => {
		if (isPrimaryModifierKey(event)) {
			event.preventDefault()
			toggleSelection(entryId, trackId, index)
			return
		}

		if (event.shiftKey) {
			event.preventDefault()
			applyShiftClick(entryId, trackId, index)
			return
		}

		if (selectionEnabled) {
			toggleSelection(entryId, trackId, index)
			return
		}

		onClick()
	}

	return {
		get selectionEnabled() {
			return selectionEnabled
		},
		get size() {
			return selected.size
		},
		get snapshot(): SelectionSnapshot {
			return {
				rows: Array.from(selected, ([entryId, trackId]) => ({ entryId, trackId })),
			}
		},
		has: (entryId: number) => selected.has(entryId),
		selectAll,
		toggleSelection,
		cancelSelection,
		isInHoverRange,
		handlePointerEnter,
		handleItemClick,
	}
}
