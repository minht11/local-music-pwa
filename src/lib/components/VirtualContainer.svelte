<script lang="ts" module>
	/**
	 * Per-index row heights. Heights are not part of the virtualizer's own
	 * invalidation key and can move while `count` stays put, so `key` must change
	 * whenever `at` would answer differently anywhere.
	 */
	export interface VariableRowSize {
		key: string | number
		at: (index: number) => number
	}

	export type RowSize = number | VariableRowSize
</script>

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
	import { wait } from '$lib/helpers/utils/wait.ts'
	import { createVirtualizerBase } from '$lib/helpers/virtualizer.svelte.ts'
	import { useScrollTarget } from './ScrollContainer.svelte'

	interface Props {
		count: number
		lanes?: number
		size: RowSize
		gap?: number
		forceRenderIndexes?: readonly number[]
		offsetWidth?: number
		key: (index: number) => string | number
		/** Rows excluded from arrow-key navigation, e.g. static section headers. */
		focusableRow?: (index: number) => boolean
		children: Snippet<[VirtualItem]>
	}

	let {
		count,
		lanes = 1,
		gap = 0,
		size: itemSize,
		forceRenderIndexes = [],
		key,
		focusableRow,
		children,
		offsetWidth = $bindable(0),
	}: Props = $props()

	const scrollTarget = useScrollTarget()
	let focusIndex = $state(-1)

	type VirtualizerTargetOptions<E extends Window | Element> = Pick<
		VirtualizerOptions<E, Element>,
		| 'getScrollElement'
		| 'observeElementRect'
		| 'observeElementOffset'
		| 'scrollToFn'
		| 'initialOffset'
	>

	const scrollTargetOptions = $derived.by(() => {
		const target = scrollTarget.current

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
		// Untracked: a focusIndex change would otherwise invalidate the virtualizer's deps.
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

			// The focused row can outlive the list shrinking under it (focusout only
			// clears focusIndex in a microtask), so bound it like forceRenderIndexes.
			if (focusIndex !== -1 && focusIndex > initialEnd && focusIndex < range.count) {
				arr.push(focusIndex)
			}

			for (const index of forceRenderIndexes) {
				if (index < 0 || index >= range.count || arr.includes(index)) {
					continue
				}

				arr.push(index)
			}

			return arr
		})

	// A new identity makes the virtualizer drop its size cache and re-probe every
	// row, so this rebuilds exactly when heights can have changed.
	const estimateSize = $derived.by(() => {
		const size = itemSize
		if (typeof size === 'number') {
			return () => size
		}

		void size.key

		return (index: number) => size.at(index)
	})

	const getVirtualizerOptions = () => {
		const options: VirtualizerOptions<Window | Element, Element> = {
			// narrowing window/element specific types is difficult so we just cast here
			...(scrollTargetOptions as VirtualizerTargetOptions<Window | Element>),
			count,
			lanes,
			estimateSize,
			rangeExtractor,
			overscan: 10,
		}

		return options
	}

	const virtualizer = createVirtualizerBase(getVirtualizerOptions)

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

	const scrollToIndexIfNeeded = async (index: number) => {
		const range = virtualizer.range
		if (!range) {
			return
		}

		// Top/bottom elements cover the element, so we adjust bounds a bit
		const startIndex = Math.max(range.startIndex - 1, 0)
		const endIndex = Math.min(range.endIndex + 1, count - 1)

		if (index >= startIndex && index <= endIndex) {
			return
		}

		virtualizer.scrollToIndex(index, {
			behavior: 'smooth',
		})

		const abortController = new AbortController()
		const { promise: scrollEndPromise, resolve } = Promise.withResolvers<void>()

		scrollTarget.current.addEventListener(
			'scrollend',
			() => {
				resolve()
			},
			{ once: true, signal: abortController.signal },
		)

		await Promise.race([
			scrollEndPromise,
			// Guard in case scrollend never happens or scroll is very long
			wait(2000),
		])

		abortController.abort()
	}

	const scrollToElementThenFocusIt = async (index: number) => {
		await scrollToIndexIfNeeded(index)

		queueMicrotask(() => {
			findRow(index)?.focus()
		})
	}

	const keydownHandler = async (e: KeyboardEvent) => {
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

		const focusableFrom = (from: number, step: number): number | null => {
			for (let index = from; index >= 0 && index < count; index += step) {
				if (focusableRow?.(index) ?? true) {
					return index
				}
			}

			return null
		}

		const increment = directionDown ? 1 : -1
		// Focus sitting on the container rather than a row means the list has not
		// been entered yet, so either arrow key enters it at the top.
		const target =
			container && doesElementHasFocus(container)
				? focusableFrom(0, 1)
				: focusableFrom(findCurrentFocusedRow() + increment, increment)

		if (target !== null) {
			await scrollToElementThenFocusIt(target)
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
		style:height={`${virtualizer.totalSize - gap}px`}
		class="@container relative w-full rounded-lg -outline-offset-2 contain-strict"
		tabindex="0"
		onfocusin={focusinHandler}
		onfocusout={focusoutHandler}
		onkeydown={keydownHandler}
	>
		{#each virtualizer.virtualItems as virtualItem (key(virtualItem.index))}
			{@render children(virtualItem)}
		{/each}
	</div>
{/if}
