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

	let focusedItemIndex = $state(-1)
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
					const final = range.count - 1

					const start = Math.max(range.startIndex - range.overscan, 0)
					let end = range.endIndex + range.overscan

					let initialI = 0
					if (focusedItemIndex !== -1) {
						if (focusedItemIndex < start) {
							initialI = 1
							len += 1
							arr[0] = focusedItemIndex
							console.log('Focused before')
						} else if (focusedItemIndex > end) {
							arr[len] = focusedItemIndex
							console.log('Focused after')
						}
					}

					end = Math.max(end, range.count - 1)
					const len = end - start + 1
					const arr = Array(len)

					for (let i = initialI; i < len; i++) {
						arr[i] = start + i
					}

					console.log('Range', arr)

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
			focusedItemIndex = nextIndex
			$virtualizer?.scrollToIndex(nextIndex)
			findRow(nextIndex)?.focus()
		}
	}

	const focusinHandler = () => {
		const index = findCurrentFocusedRow()
		if (index !== -1) {
			focusedItemIndex = index
		}
	}

	const focusoutHandler = () => {
		queueMicrotask(() => {
			const index = findCurrentFocusedRow()
			if (index === -1) {
				focusedItemIndex = -1
			}
		})
	}
</script>

<div class="fixed top-0 bg-blue">
	{focusedItemIndex}
</div>
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
