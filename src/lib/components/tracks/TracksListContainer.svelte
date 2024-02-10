<script lang="ts" context="module">
	import TrackListItem from './TrackListItem.svelte'
	import type { Track } from '$lib/db/entities'
	import VirtualContainer from '../VirtualContainer.svelte'

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
			ariaRowIndex={item.index}
			menuItems={() => [
				{
					label: 'Add to queue',
					action: () => {
						// TODO.
						console.log('Add to queue')
					},
				},
			]}
			onclick={(track) => {
				onItemClick({
					track,
					items,
					index: item.index,
				})
			}}
		/>
	{/snippet}
</VirtualContainer>
