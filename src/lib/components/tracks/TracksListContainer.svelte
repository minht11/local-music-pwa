<script lang="ts" context="module">
	import type { Track } from '$lib/db/entities'
	import VirtualContainer from '../VirtualContainer.svelte'
	import TrackListItem from './TrackListItem.svelte'

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

	interface Props {
		items: number[]
		onItemClick?: (data: TrackItemClick) => void
	}

	const { items, onItemClick = defaultOnItemClick }: Props = $props()
</script>

<VirtualContainer size={72} count={items.length} key={(index) => items[index] as number}>
	{#snippet children(item)}
		{@const  trackId = items[item.index] as number}

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
