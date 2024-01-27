<script lang="ts">
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
		children: Snippet<VirtualItem>
	}>()

	let rowVirtualizer: Readable<SvelteVirtualizer<Window, Element>> | undefined

	$effect(() => {
		if (!rowVirtualizer && lanes === 0) {
			return
		}

		// Add it so effect watch for size changes
		itemSize

		const baseOptions = {
			count,
			lanes,
		}

		if (!rowVirtualizer) {
			rowVirtualizer = createWindowVirtualizer({
				...baseOptions,
				estimateSize: () => itemSize,
				overscan: 10,
			})
		}

		untrack(() => {
			$rowVirtualizer?.setOptions(baseOptions)
			$rowVirtualizer?.measure()
		})
	})
</script>

<div
	bind:offsetWidth
	style:height={`${($rowVirtualizer?.getTotalSize() ?? 0) - gap}px`}
	class="contain-strict relative w-full @container"
>
	{#each $rowVirtualizer?.getVirtualItems() ?? [] as virtualItem (key(virtualItem.index))}
		{@render children(virtualItem)}
	{/each}
</div>
