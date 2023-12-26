<script lang="ts">
	import { createVirtualizer } from '@tanstack/svelte-virtual'
	import TrackListItem from '$lib/components/TrackListItem.svelte'
	import { useScrollTarget } from '$lib/helpers/scroll-target.svelte.js'

	const { data } = $props()

	const scrollTarget = useScrollTarget()

	const rowVirtualizer = createVirtualizer({
		count: data.tracks.length,
		getScrollElement: scrollTarget,
		estimateSize: () => 72,
		overscan: 10,
	})
</script>

<div style:height={`${$rowVirtualizer.getTotalSize()}px`} class="contain-strict relative w-full">
	{#each $rowVirtualizer.getVirtualItems() as virtualItem (virtualItem.key)}
		{@const trackId = data.tracks[virtualItem.index]}
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
			/>
		{/if}
	{/each}
</div>
