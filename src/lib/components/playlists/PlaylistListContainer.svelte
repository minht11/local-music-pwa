<script lang="ts" context="module">
	import type { Playlist } from '$lib/db/entities'
	import { useMainStore } from '$lib/stores/main-store.svelte'
	import VirtualContainer from '../VirtualContainer.svelte'
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
		onItemClick?: (data: TrackItemClick) => void
	}

	const { items, onItemClick }: Props = $props()

	const main = useMainStore()
</script>

<VirtualContainer size={56} count={items.length} key={(index) => items[index] as number}>
	{#snippet children(item)}
		{@const playlistId = items[item.index] as number}

		<PlaylistListItem
			{playlistId}
			style="transform: translateY({item.start}px)"
			class="virtual-item top-0 left-0 w-full"
			ariaRowIndex={item.index}
			menuItems={(playlist) => [
				{
					label: 'Edit playlist',
					action: () => {
						// TODO.
					},
				},
				{
					label: 'Remove playlist',
					action: () => {
						main.removePlaylistDialogOpen = {
							id: playlist.id,
							name: playlist.name,
						}
					},
				},
			]}
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
