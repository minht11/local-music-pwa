<script lang="ts" context="module">
	import { goto } from '$app/navigation'
	import { createWindowVirtualizer, type SvelteVirtualizer } from '@tanstack/svelte-virtual'
	import type { Album } from '$lib/db/entities'
	import AlbumGridItem from './AlbumGridItem.svelte'
	import { safeInteger } from '$lib/helpers/utils'
	import type { Readable } from 'svelte/store'
	import { untrack } from 'svelte'

	export interface AlbumItemClick {
		album: Album
		items: number[]
		index: number
	}
</script>

<script lang="ts">
	const { items, onItemClick } = $props<{
		items: number[]
		onItemClick?: (data: AlbumItemClick) => void
	}>()

	let containerWidth = $state(0)

	const gap = 16

	// Width must fill the container like css grid grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	const calculateWidthHeightAndColumns = () => {
		const minWidth = containerWidth > 600 ? 180 : 140

		const columns = safeInteger(Math.floor(containerWidth / minWidth), 1)
		const width = safeInteger(Math.floor((containerWidth - gap * (columns - 1)) / columns))

		const height = width + 72

		return {
			width,
			height: height + gap,
			columns,
			heightWithoutGap: height,
		}
	}

	const sizes = $derived(calculateWidthHeightAndColumns())

	let rowVirtualizer: Readable<SvelteVirtualizer<Window, Element>> | undefined

	$effect(() => {
		if (!rowVirtualizer && sizes.columns === 0) {
			return
		}

		const baseOptions = {
			count: items.length,
			lanes: sizes.columns,
		}

		if (!rowVirtualizer) {
			rowVirtualizer = createWindowVirtualizer({
				...baseOptions,
				estimateSize: () => sizes.height,
				measureElement: (element) => {
					console.log(element)
					return 100
				},
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
	bind:offsetWidth={containerWidth}
	style:height={`${($rowVirtualizer?.getTotalSize() ?? 0) - gap}px`}
	class="contain-strict relative w-full @container"
>
	{#each $rowVirtualizer?.getVirtualItems() ?? [] as virtualItem (virtualItem.index)}
		{@const albumId = items[virtualItem.index]}
		{#if albumId}
			<AlbumGridItem
				{albumId}
				index={virtualItem.index}
				style={[
					'contain: strict',
					'will-change: transform;',
					'position: absolute',
					'top: 0',
					`left: ${virtualItem.lane * sizes.width + virtualItem.lane * gap}px`,
					`width: ${sizes.width}px`,
					`height: ${virtualItem.size - gap}px`,
					`transform: translateY(${virtualItem.start}px)`,
				].join(';')}
				onclick={() => {
					goto(`/album/${albumId}`)
				}}
			/>
		{/if}
	{/each}
</div>
