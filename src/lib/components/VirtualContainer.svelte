<script lang="ts">
	import { doesElementHasFocus, findFocusedElement } from '$lib/helpers/focus'
	import {
		createWindowVirtualizer,
		type SvelteVirtualizer,
		type VirtualItem,
	} from '@tanstack/svelte-virtual'
	import { untrack } from 'svelte'
	import type { Readable } from 'svelte/motion'

	let {
		count,
		lanes = 1,
		gap = 0,
		size: itemSize,
		key,
		children,
		// @ts-expect-error TODO. https://github.com/sveltejs/language-tools/issues/2268
		offsetWidth,
	} = $props<{
		count: number
		lanes?: number
		size: number
		gap?: number
		offsetWidth?: number
		key: (index: number) => string | number
		children: Snippet<[VirtualItem]>
	}>()

	let focusIndex = $state(-1)
	let virtualizer: Readable<SvelteVirtualizer<Window, Element>> | undefined

	$effect(() => {
		if (!virtualizer && lanes === 0) {
			return
		}

		// Add it so effect watch for size changes
		itemSize

		const baseOptions = {
			count,
			lanes,
		}

		if (!virtualizer) {
			virtualizer = createWindowVirtualizer({
				...baseOptions,
				estimateSize: () => itemSize,
				overscan: 10,
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
			})
		}

		untrack(() => {
			$virtualizer?.setOptions(baseOptions)
			$virtualizer?.measure()
		})
	})

	let container = $state<HTMLDivElement>()!

	const findRow = (index: number) => {
		const el = container.querySelector(`[aria-rowindex="${index}"]`)
		if (el instanceof HTMLElement) {
			return el
		}

		return null
	}

	const findCurrentFocusedRow = () => {
		const index = Number(findFocusedElement(container)?.ariaRowIndex)

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

		if (doesElementHasFocus(container)) {
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

<div
	bind:this={container}
	bind:offsetWidth
	role="grid"
	aria-rowcount={count}
	style:height={`${($virtualizer?.getTotalSize() ?? 0) - gap}px`}
	class="contain-strict relative w-full @container rounded-8px outline-offset--2px"
	tabindex="0"
	onfocusin={focusinHandler}
	onfocusout={focusoutHandler}
	onkeydown={keydownHandler}
>
	{#each $virtualizer?.getVirtualItems() ?? [] as virtualItem (key(virtualItem.index))}
		{@render children(virtualItem)}
	{/each}
</div>
