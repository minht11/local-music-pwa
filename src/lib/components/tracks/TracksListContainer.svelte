<script lang="ts" context="module">
	import { createWindowVirtualizer } from '@tanstack/svelte-virtual'
	import TrackListItem from './TrackListItem.svelte'
	import type { Track } from '$lib/db/entities'
	import { usePlayer } from '$lib/stores/player/store'

	export interface TrackItemClick {
		track: Track
		items: number[]
		index: number
	}
</script>

<script lang="ts">
	const player = usePlayer()

	const defaultOnItemClick = (data: TrackItemClick) => {
		player.playTrack(data.index, data.items)
	}

	const { items, onItemClick = defaultOnItemClick } = $props<{
		items: number[]
		onItemClick?: (data: TrackItemClick) => void
	}>()

	const rowVirtualizer = createWindowVirtualizer({
		count: items.length,
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
					onItemClick({
						track,
						items,
						index: virtualItem.index,
					})
				}}
			/>
		{/if}
	{/each}
</div>
