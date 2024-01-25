<script lang="ts" context="module">
	import TrackListItem from './TrackListItem.svelte'
	import type { Track } from '$lib/db/entities'
	import VirtualContainer from '../VirtualContainer.svelte'
	import { useMenu } from '../menu/MenuProvider.svelte'

	export interface TrackItemClick {
		track: Track
		items: number[]
		index: number
	}
</script>

<script lang="ts">
	const player = usePlayer()
	const menu = useMenu()

	const defaultOnItemClick = (data: TrackItemClick) => {
		player.playTrack(data.index, data.items)
	}

	const { items, onItemClick = defaultOnItemClick } = $props<{
		items: number[]
		onItemClick?: (data: TrackItemClick) => void
	}>()
</script>

<VirtualContainer size={72} count={items.length} key={(index) => items[index] as number}>
	{#snippet children(item)}
		{@const trackId = items[item.index] as number}

		<TrackListItem
			{trackId}
			active={player.activeTrack?.id === trackId}
			style="transform: translateY({item.start}px)"
			class="virtual-item top-0 left-0 w-full"
			onclick={(track) => {
				onItemClick({
					track,
					items,
					index: item.index,
				})
			}}
			oncontextmenu={(_, e) => {
				menu.show([], e.target as HTMLElement, {
					anchor: false,
					position: { top: e.y, left: e.x }
				})
			}}
		/>
	{/snippet}
</VirtualContainer>
