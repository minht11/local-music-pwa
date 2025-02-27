<script lang="ts">
	import { doesElementHasFocus, findFocusedElement } from '$lib/helpers/focus'
	import {
		type SvelteVirtualizer,
		type VirtualItem,
		type VirtualizerOptions,
		createVirtualizer,
		createWindowVirtualizer,
	} from '@tanstack/svelte-virtual'
	import { untrack } from 'svelte'
	import type { Readable } from 'svelte/store'
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
		// @ts-expect-error TODO. https://github.com/sveltejs/language-tools/issues/2268
		offsetWidth = $bindable(0),
	}: Props = $props()

	const scrollContainer = useScrollTarget()

	let focusIndex = $state(-1)
	let virtualizer:
		| Readable<SvelteVirtualizer<Element, Element> | SvelteVirtualizer<Window, Element>>
		| undefined

	$effect(() => {
		const scrollTarget = scrollContainer.scrollTarget

		if ((!virtualizer && lanes === 0) || !scrollTarget) {
			return
		}

		// Add it so effect watch for size changes
		itemSize

		const baseOptions = {
			count,
			lanes,
		}

		if (!virtualizer || untrack(() => $virtualizer?.scrollElement !== scrollTarget)) {
			type CommonOptions = Parameters<typeof createVirtualizer>[0]

			const commonOptions: CommonOptions = {
				...baseOptions,
				estimateSize: () => itemSize,
				overscan: 10,
				getScrollElement: () => scrollTarget as Element,
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

			if (scrollTarget === window) {
				virtualizer = createWindowVirtualizer(
					commonOptions as unknown as VirtualizerOptions<Window, Element>,
				)
			} else {
				virtualizer = createVirtualizer({
					...commonOptions,
					getScrollElement: () => scrollTarget as Element,
				})
			}
		}

		untrack(() => {
			$virtualizer?.setOptions(baseOptions)
			$virtualizer?.measure()
		})
	})

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
			$virtualizer?.scrollToIndex(currentIndex, {
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
		style:height={`${($virtualizer?.getTotalSize() ?? 0) - gap}px`}
		class="@container relative w-full rounded-lg -outline-offset-2 contain-strict"
		tabindex="0"
		onfocusin={focusinHandler}
		onfocusout={focusoutHandler}
		onkeydown={keydownHandler}
	>
		{#each $virtualizer?.getVirtualItems() ?? [] as virtualItem (key(virtualItem.index))}
			{@render children(virtualItem)}
		{/each}
	</div>
{/if}
