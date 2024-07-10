<script lang="ts" context="module">
	import type { Track } from '$lib/db/entities'
	import type { MenuItem } from '../ListItem.svelte'
	import VirtualContainer from '../VirtualContainer.svelte'
	import TrackListItem from './TrackListItem.svelte'

	export type PredefinedTrackMenuItems = 'addToQueue' | 'addToPlaylist' | 'removeFromLibrary'
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
		predefinedMenuItems?: Partial<Record<PredefinedTrackMenuItems, boolean>>
		onItemClick?: (data: TrackItemClick) => void
	}

	const { items, predefinedMenuItems = {}, onItemClick = defaultOnItemClick }: Props = $props()

	interface PredefinedMenuItem extends MenuItem {
		predefinedKey: PredefinedTrackMenuItems
	}

	const getMenuItems = () => {
		const items: PredefinedMenuItem[] = [
			{
				predefinedKey: 'addToQueue',
				label: 'Add to queue',
				action: () => {
					// TODO.
					console.log('Add to queue')
				},
			},
			{
				predefinedKey: 'addToPlaylist',
				label: 'Add to playlist',
				action: () => {
					// TODO.
				},
			},
			{
				predefinedKey: 'removeFromLibrary',
				label: 'Remove from library',
				action: () => {
					// TODO.
					console.log('Remove from library')
				},
			},
		]

		return items.filter((item) => {
			// By default, all predefined menu items are enabled.
			const isExplicitlyDisabled = predefinedMenuItems[item.predefinedKey] === false

			return !isExplicitlyDisabled
		})
	}
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
			menuItems={() => getMenuItems()}
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
