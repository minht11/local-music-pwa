<script lang="ts">
	import {
		elementScroll,
		observeElementOffset,
		observeElementRect,
		observeWindowOffset,
		observeWindowRect,
		type Range,
		type VirtualItem,
		type VirtualizerOptions,
		windowScroll,
	} from '@tanstack/virtual-core'
	import { doesElementHasFocus, findFocusedElement } from '$lib/helpers/focus.ts'
	import { createVirtualizerBase } from '$lib/helpers/virtualizer.svelte.ts'
	import { useScrollTarget } from './ScrollContainer.svelte'

	interface Props {
		count: number
		lanes?: number
		size: number
		gap?: number
		offsetWidth?: number
		key: (index: number) => string | number
		children: Snippet<[VirtualItem]>
	}

	let {
		count,
		lanes = 1,
		gap = 0,
		size: itemSize,
		key,
		children,
		offsetWidth = $bindable(0),
	}: Props = $props()

	const scrollContainerTarget = useScrollTarget()

	type VirtualizerTargetOptions<E extends Window | Element> = Pick<
		VirtualizerOptions<E, Element>,
		| 'getScrollElement'
		| 'observeElementRect'
		| 'observeElementOffset'
		| 'scrollToFn'
		| 'initialOffset'
	>

	const scrollTargetOptions = $derived.by(() => {
		const target = scrollContainerTarget.scrollTarget

		if (target instanceof Window) {
			const options: VirtualizerTargetOptions<Window> = {
				getScrollElement: () => target,
				observeElementRect: observeWindowRect,
				observeElementOffset: observeWindowOffset,
				scrollToFn: windowScroll,
				initialOffset: () => window.scrollY,
			}

			return options
		}

		const options: VirtualizerTargetOptions<Element> = {
			getScrollElement: () => target,
			observeElementRect,
			observeElementOffset,
			scrollToFn: elementScroll,
		}

		return options
	})

	const rangeExtractor = (range: Range) =>
		// We untrack because when focusIndex changes it forces virtualizer deps to change
		// which is not needed here.
		untrack(() => {
			const start = Math.max(range.startIndex - range.overscan, 0)
			const initialEnd = range.endIndex + range.overscan

			const arr = []
			if (focusIndex !== -1 && focusIndex < start) {
				arr.push(focusIndex)
			}

			const end = Math.min(initialEnd, range.count - 1)
			for (let i = start; i <= end; i += 1) {
				arr.push(i)
			}

			if (focusIndex !== -1 && focusIndex > initialEnd) {
				arr.push(focusIndex)
			}

			return arr
		})

	const getVirtualizerOptions = () => {
		const options: VirtualizerOptions<Window | Element, Element> = {
			// narrowing window/element specific types is difficult so we just cast here
			...(scrollTargetOptions as VirtualizerTargetOptions<Window | Element>),
			count,
			lanes,
			estimateSize: () => itemSize,
			rangeExtractor,
			overscan: 10,
		}

		return options
	}

	const virtualizer = createVirtualizerBase(getVirtualizerOptions)

	let focusIndex = $state(-1)

	let container = $state<HTMLDivElement>()

	const findRow = (index: number) => {
		const el = container?.querySelector(`[aria-rowindex="${index}"]`)
		if (el instanceof HTMLElement) {
			return el
		}

		return null
	}

	const findCurrentFocusedRow = () => {
		const index = container ? Number(findFocusedElement(container)?.ariaRowIndex) : -1

		return Number.isNaN(index) ? -1 : index
	}

	const keydownHandler = (e: KeyboardEvent) => {
		let directionDown: boolean | undefined
		if (e.key === 'ArrowDown') {
			directionDown = true
		} else if (e.key === 'ArrowUp') {
			directionDown = false
		}

		if (directionDown === undefined) {
			return
		}

		e.preventDefault()

		if (container && doesElementHasFocus(container)) {
			findRow(0)?.focus()

			return
		}

		const increment = directionDown ? 1 : -1
		const currentIndex = findCurrentFocusedRow()

		const nextIndex = currentIndex + increment
		if (nextIndex >= 0 && nextIndex < count) {
			virtualizer.scrollToIndex(currentIndex, {
				behavior: 'smooth',
			})

			queueMicrotask(() => {
				findRow(nextIndex)?.focus()
			})
		}
	}

	const focusinHandler = () => {
		const index = findCurrentFocusedRow()
		if (index !== -1) {
			focusIndex = index
		}
	}

	const focusoutHandler = () => {
		queueMicrotask(() => {
			const index = findCurrentFocusedRow()
			if (index === -1) {
				focusIndex = -1
			}
		})
	}
</script>

{#if count === 0}
	<div class="m-auto h-max w-max self-center justify-self-center text-center">
		{m.noItemsToDisplay()}
	</div>
{:else}
	<div
		bind:this={container}
		bind:offsetWidth
		role="grid"
		aria-rowcount={count}
		style:height={`${virtualizer.getTotalSize() - gap}px`}
		class="@container relative w-full rounded-lg -outline-offset-2 contain-strict"
		tabindex="0"
		onfocusin={focusinHandler}
		onfocusout={focusoutHandler}
		onkeydown={keydownHandler}
	>
		{#each virtualizer.getVirtualItems() as virtualItem (key(virtualItem.index))}
			{@render children(virtualItem)}
		{/each}
	</div>
{/if}
