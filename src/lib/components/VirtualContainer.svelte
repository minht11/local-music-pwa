<script lang="ts">
	import {
		elementScroll,
		observeElementOffset,
		observeElementRect,
		observeWindowOffset,
		observeWindowRect,
		type VirtualItem,
		Virtualizer,
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
		size: itemSize2,
		key,
		children,
		offsetWidth = $bindable(0),
	}: Props = $props()

	const scrollContainer = useScrollTarget()

	const target = $derived.by(() => {
		const scrollContainerTarget = scrollContainer.scrollTarget

		if (scrollContainerTarget instanceof Window) {
			return {
				isWindow: true,
				element: scrollContainerTarget,
			}
		}

		return {
			isWindow: false,
			element: scrollContainerTarget,
		}
	})

	const itemSize = $derived(itemSize2)

	const getVirtualizerOptions = <
		IsWindow extends boolean,
		E extends IsWindow extends true ? Window : Element,
	>(): VirtualizerOptions<E, Element> => {
		type VirtualizerWindowInstance = Virtualizer<Window, Element>
		type VirtualizerElementInstance = Virtualizer<Element, Element>

		return {
			observeElementRect: (instance, cb) =>
				target.isWindow
					? observeWindowRect(instance as unknown as VirtualizerWindowInstance, cb)
					: observeElementRect(instance as unknown as VirtualizerElementInstance, cb),
			observeElementOffset: (instance, cb) =>
				target.isWindow
					? observeWindowOffset(instance as unknown as VirtualizerWindowInstance, cb)
					: observeElementOffset(instance as unknown as VirtualizerElementInstance, cb),
			scrollToFn: (offset, scrollOptions, instance) =>
				target.isWindow
					? windowScroll(offset, scrollOptions, instance as unknown as VirtualizerWindowInstance)
					: elementScroll(offset, scrollOptions, instance as unknown as VirtualizerElementInstance),
			initialOffset: () => (target.isWindow ? window.scrollY : 0),
			count,
			lanes,
			estimateSize: () => itemSize,
			overscan: 10,
			getScrollElement: () => target.element as E,
			rangeExtractor: (range) => {
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
			},
		}
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
