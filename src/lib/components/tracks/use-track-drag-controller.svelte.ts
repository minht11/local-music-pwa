import { useScrollTarget } from '../ScrollContainer.svelte'
import type { TrackRowIdentity } from './selection.ts'

const EDGE_THRESHOLD = 84
const MAX_SCROLL_STEP = 30

interface DragState {
	/** Fixed for the gesture, so the preview survives the list moving the row. */
	readonly row: TrackRowIdentity
	fromIndex: number
	insertIndex: number
	preview: {
		top: number
		left: number
		width: number
	}
}

interface UseTrackDragControllerOptions {
	itemsCount: () => number
	/**
	 * `insertSlot` is a gap between rows (0..count). The list can mutate mid-drag,
	 * so `fromIndex` is where the gesture began, not where the row is now.
	 */
	onDrop: (row: TrackRowIdentity, fromIndex: number, insertSlot: number) => void
	onStart?: () => void
}

export const useTrackDragController = ({
	itemsCount,
	onDrop,
	onStart,
}: UseTrackDragControllerOptions) => {
	const scrollTarget = useScrollTarget()
	let drag = $state<DragState | null>(null)

	let activePointerId: number | null = null
	let pointerOffsetY = 0
	let currentPointerY = 0
	let rafId: number | null = null
	let abortController: AbortController | null = null

	let scrollViewport = { top: 0, bottom: 0 }

	const refreshScrollViewport = () => {
		const target = scrollTarget.current
		if (target instanceof Window) {
			scrollViewport = { top: 0, bottom: target.innerHeight }
			return
		}
		const rect = target.getBoundingClientRect()
		scrollViewport = { top: rect.top, bottom: rect.bottom }
	}

	$effect(() => {
		const target = scrollTarget.current
		const observed = target instanceof Window ? document.documentElement : target
		refreshScrollViewport()

		const observer = new ResizeObserver(refreshScrollViewport)
		observer.observe(observed)
		return () => observer.disconnect()
	})

	const scrollLoop = () => {
		const { top, bottom } = scrollViewport

		const topDelta = top + EDGE_THRESHOLD - currentPointerY
		const bottomDelta = currentPointerY - (bottom - EDGE_THRESHOLD)

		if (topDelta > 0) {
			scrollTarget.current.scrollBy(
				0,
				-Math.round((topDelta / EDGE_THRESHOLD) * MAX_SCROLL_STEP),
			)
			rafId = requestAnimationFrame(scrollLoop)
		} else if (bottomDelta > 0) {
			scrollTarget.current.scrollBy(
				0,
				Math.round((bottomDelta / EDGE_THRESHOLD) * MAX_SCROLL_STEP),
			)
			rafId = requestAnimationFrame(scrollLoop)
		} else {
			rafId = null
		}
	}

	const getInsertIndex = (x: number, y: number): number | null => {
		const target = document.elementFromPoint(x, y)
		if (!(target instanceof Element)) {
			return null
		}

		const row = target.closest('[aria-rowindex]')
		if (!(row instanceof HTMLElement)) {
			return null
		}

		// Live count: the list can mutate mid-drag, so a snapshot would clamp wrong.
		const count = itemsCount()
		const index = Number(row.ariaRowIndex)
		if (!Number.isInteger(index) || index < 0 || index >= count) {
			return null
		}

		const rowRect = row.getBoundingClientRect()
		const isAfterHalf = y >= rowRect.top + rowRect.height / 2
		return Math.max(0, Math.min(count, isAfterHalf ? index + 1 : index))
	}

	const stop = () => {
		drag = null
		activePointerId = null
		if (rafId !== null) {
			cancelAnimationFrame(rafId)
			rafId = null
		}
		abortController?.abort()
		abortController = null
	}

	// Releasing a drag synthesizes a `click` that retargets to the row and reads as an
	// activation. The zero timeout disarms right after the current event turn, so a
	// click that never materializes cannot eat a later one.
	const suppressGestureClick = () => {
		const suppress = (event: Event) => {
			event.preventDefault()
			event.stopPropagation()
		}
		window.addEventListener('click', suppress, { capture: true, once: true })
		setTimeout(() => {
			window.removeEventListener('click', suppress, { capture: true })
		}, 0)
	}

	const handlePointerDown = (index: number, row: TrackRowIdentity, e: PointerEvent) => {
		const count = itemsCount()
		if (index < 0 || index >= count) {
			return
		}

		e.preventDefault()
		e.stopPropagation()

		const rowElement = (e.currentTarget as HTMLElement | null)?.closest('[aria-rowindex]')
		if (!(rowElement instanceof HTMLElement)) {
			return
		}

		stop()

		onStart?.()

		const rowRect = rowElement.getBoundingClientRect()
		pointerOffsetY = e.clientY - rowRect.top
		activePointerId = e.pointerId

		drag = {
			row,
			fromIndex: index,
			insertIndex: index,
			preview: { top: rowRect.top, left: rowRect.left, width: rowRect.width },
		}

		abortController = new AbortController()

		const onMove = (event: PointerEvent) => {
			if (event.pointerId !== activePointerId || !drag) {
				return
			}
			event.preventDefault()

			drag.preview.top = event.clientY - pointerOffsetY
			currentPointerY = event.clientY
			if (rafId === null) {
				rafId = requestAnimationFrame(scrollLoop)
			}

			const newInsertIndex = getInsertIndex(event.clientX, event.clientY)
			if (newInsertIndex !== null) {
				drag.insertIndex = newInsertIndex
			}
		}

		const onEnd = (event: PointerEvent) => {
			if (event.pointerId !== activePointerId || !drag) {
				return
			}

			const { row: draggedRow, fromIndex, insertIndex } = drag
			suppressGestureClick()
			stop()

			onDrop(draggedRow, fromIndex, insertIndex)
		}

		// The browser took over the gesture (scroll, shade); abort instead of dropping.
		const onCancel = (event: PointerEvent) => {
			if (event.pointerId === activePointerId) {
				stop()
			}
		}

		window.addEventListener('pointermove', onMove, {
			passive: false,
			signal: abortController.signal,
		})
		window.addEventListener('pointerup', onEnd, { signal: abortController.signal })
		window.addEventListener('pointercancel', onCancel, { signal: abortController.signal })
	}

	$effect(() => {
		const cleanup = stop

		return cleanup
	})

	return {
		get drag() {
			return drag
		},
		handlePointerDown,
	}
}
