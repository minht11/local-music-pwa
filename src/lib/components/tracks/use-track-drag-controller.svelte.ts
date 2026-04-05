import { useScrollTarget } from '../ScrollContainer.svelte'

const EDGE_THRESHOLD = 84
const MAX_SCROLL_STEP = 30

interface DragState {
	fromIndex: number
	insertIndex: number
	preview: {
		top: number
		left: number
		width: number
	}
}

interface UseTrackDragControllerOptions {
	items: () => readonly number[]
	onReorder: ((from: number, to: number) => void) | undefined
	onStart?: () => void
}

export const useTrackDragController = ({
	items,
	onReorder,
	onStart,
}: UseTrackDragControllerOptions) => {
	const scrollTarget = useScrollTarget()
	let drag = $state<DragState | null>(null)

	let activePointerId: number | null = null
	let pointerOffsetY = 0
	let currentPointerY = 0
	let dragItemCount = 0
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

		const index = Number(row.ariaRowIndex)
		if (!Number.isInteger(index) || index < 0 || index >= dragItemCount) {
			return null
		}

		const rowRect = row.getBoundingClientRect()
		const isAfterHalf = y >= rowRect.top + rowRect.height / 2
		return Math.max(0, Math.min(dragItemCount, isAfterHalf ? index + 1 : index))
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

	const start = (index: number, e: PointerEvent) => {
		const itemCount = items().length
		if (!onReorder || index < 0 || index >= itemCount) {
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
		dragItemCount = itemCount

		drag = {
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

			const from = drag.fromIndex
			const insertIndex = drag.insertIndex
			stop()

			// insertIndex is a slot *between* items; when the item moved downward the
			// slot index is one ahead of the target item index, so subtract 1.
			const to = insertIndex > from ? insertIndex - 1 : insertIndex
			if (to !== from) {
				onReorder(from, to)
			}
		}

		window.addEventListener('pointermove', onMove, {
			passive: false,
			signal: abortController.signal,
		})
		window.addEventListener('pointerup', onEnd, { signal: abortController.signal })
		window.addEventListener('pointercancel', onEnd, { signal: abortController.signal })
	}

	return {
		get drag() {
			return drag
		},
		start,
		stop,
	}
}
