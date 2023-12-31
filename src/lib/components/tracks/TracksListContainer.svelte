<script lang="ts" context="module">
	import { useScrollTarget } from '$lib/helpers/scroll-target.svelte'
	import { createVirtualizer } from '@tanstack/svelte-virtual'
	import TrackListItem from './TrackListItem.svelte'
	import type { Track } from '$lib/db/entities'

	export interface TrackItemClick {
		track: Track
		items: number[]
		index: number
	}
</script>

<script lang="ts">
	const { items, onItemClick } = $props<{
		items: number[]
		onItemClick?: (data: TrackItemClick) => void
	}>()

	const scrollTarget = useScrollTarget()

	const rowVirtualizer = createVirtualizer({
		count: items.length,
		getScrollElement: scrollTarget,
		estimateSize: () => 72,
		overscan: 10,
	})
</script>

<div
	style:height={`${$rowVirtualizer.getTotalSize()}px`}
	class="contain-strict relative w-full @container"
>
	{#each $rowVirtualizer.getVirtualItems() as virtualItem (items[virtualItem.index])}
		{@const trackId = items[virtualItem.index]}
		{#if trackId}
			<TrackListItem
				{trackId}
				style={[
					'contain: strict',
					'will-change: transform;',
					'position: absolute',
					'top: 0',
					'left: 0',
					'width: 100%',
					`height: ${virtualItem.size}px`,
					`transform: translateY(${virtualItem.start}px)`,
				].join(';')}
				onclick={(track) => {
					onItemClick?.({
						track,
						items,
						index: virtualItem.index,
					})
				}}
			/>
		{/if}
	{/each}
</div>
