<script lang="ts" context="module">
	import type { Playlist } from '$lib/db/entities'
	import type { Snippet } from 'svelte'
	import type { MenuItem } from '../ListItem.svelte'
	import VirtualContainer from '../VirtualContainer.svelte'
	import type { IconType } from '../icon/Icon.svelte'
	import PlaylistListItem from './PlaylistListItem.svelte'

	export interface TrackItemClick {
		playlist: Playlist
		items: number[]
		index: number
	}
</script>

<script lang="ts">
	interface Props {
		items: number[]
		icon?: Snippet<[Playlist]> | IconType
		onItemClick?: (data: TrackItemClick) => void
		menuItems?: (playlist: Playlist) => MenuItem[]
	}

	const { items, icon, menuItems, onItemClick }: Props = $props()
</script>

<VirtualContainer size={56} count={items.length} key={(index) => items[index] as number}>
	{#snippet children(item)}
		{@const playlistId = items[item.index] as number}

		<PlaylistListItem
			{playlistId}
			style="transform: translateY({item.start}px)"
			class="virtual-item top-0 left-0 w-full"
			ariaRowIndex={item.index}
			{menuItems}
			{icon}
			onclick={(playlist) => {
				onItemClick?.({
					playlist,
					items,
					index: item.index,
				})
			}}
		/>
	{/snippet}
</VirtualContainer>
