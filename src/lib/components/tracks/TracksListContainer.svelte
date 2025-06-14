<script lang="ts" module>
	import type { TrackData } from '$lib/library/get/value.ts'
	import { toggleFavoriteTrack } from '$lib/library/playlists-actions'
	import { removeTrack } from '$lib/library/tracks-actions'
	import type { MenuItem } from '../ListItem.svelte'
	import VirtualContainer from '../VirtualContainer.svelte'
	import TrackListItem from './TrackListItem.svelte'

	export type PredefinedTrackMenuItems =
		| 'addToQueue'
		| 'addToPlaylist'
		| 'removeFromLibrary'
		| 'addToFavorites'
	export interface TrackItemClick {
		track: TrackData
		items: readonly number[]
		index: number
	}
</script>

<script lang="ts">
	const player = usePlayer()
	const main = useMainStore()

	const defaultOnItemClick = (data: TrackItemClick) => {
		player.playTrack(data.index, data.items)
	}

	interface Props {
		items: readonly number[]
		predefinedMenuItems?: Partial<Record<PredefinedTrackMenuItems, boolean>>
		menuItems?: (track: TrackData) => MenuItem[]
		onItemClick?: (data: TrackItemClick) => void
	}

	const {
		items,
		menuItems,
		predefinedMenuItems = {},
		onItemClick = defaultOnItemClick,
	}: Props = $props()

	interface PredefinedMenuItem extends MenuItem {
		predefinedKey: PredefinedTrackMenuItems
	}

	const getMenuItems = (track: TrackData) => {
		const items: PredefinedMenuItem[] = [
			{
				predefinedKey: 'addToPlaylist',
				label: m.libraryAddToPlaylist(),
				action: () => {
					main.addTrackToPlaylistDialogOpen = [track.id]
				},
			},
			{
				predefinedKey: 'addToFavorites',
				label: track.favorite ? m.trackRemoveFromFavorites() : m.trackAddToFavorites(),
				action: () => {
					void toggleFavoriteTrack(track.favorite, track.id)
				},
			},
			{
				predefinedKey: 'addToQueue',
				label: m.playerAddToQueue(),
				action: () => {
					player.addToQueue(track.id)
				},
			},
			{
				predefinedKey: 'removeFromLibrary',
				label: m.libraryRemoveFromLibrary(),
				action: () => {
					void removeTrack(track.id)
				},
			},
		]

		const predefinedItems = items.filter((item) => {
			// By default, all predefined menu items are enabled.
			const isExplicitlyDisabled = predefinedMenuItems[item.predefinedKey] === false

			return !isExplicitlyDisabled
		})

		return [...predefinedItems, ...(menuItems ? menuItems(track) : [])]
	}
</script>

<VirtualContainer size={72} count={items.length} key={(index) => `${items[index]}-${index}`}>
	{#snippet children(item)}
		{@const trackId = items[item.index] as number}

		<TrackListItem
			{trackId}
			active={player.activeTrack?.id === trackId}
			style="transform: translateY({item.start}px)"
			class="virtual-item top-0 left-0 w-full"
			ariaRowIndex={item.index}
			menuItems={(track) => getMenuItems(track)}
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
