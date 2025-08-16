<script lang="ts" module>
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import { getDatabase } from '$lib/db/database'
	import type { TrackData } from '$lib/library/get/value.ts'
	import { toggleFavoriteTrack } from '$lib/library/playlists-actions'
	import { removeTrack } from '$lib/library/remove.ts'
	import type { MenuItem } from '../ListItem.svelte'
	import { snackbar } from '../snackbar/snackbar.ts'
	import VirtualContainer from '../VirtualContainer.svelte'
	import TrackListItem from './TrackListItem.svelte'

	export type PredefinedTrackMenuItems =
		| 'addToQueue'
		| 'addToPlaylist'
		| 'removeFromLibrary'
		| 'addToFavorites'
		| 'viewAlbum'
		| 'viewArtist'

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
		menuItems?: (track: TrackData, index: number) => MenuItem[]
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

	const viewRelated = async (store: 'albums' | 'artists', name: string) => {
		try {
			const db = await getDatabase()
			const album = await db.getFromIndex(store, 'name', name)
			invariant(album)

			const path = resolve('/(app)/library/[[slug=libraryEntities]]/[uuid]', {
				slug: store,
				uuid: album.uuid,
			})

			await goto(path)
		} catch (error) {
			snackbar.unexpectedError(error)
		}
	}

	const getMenuItems = (track: TrackData, index: number) => {
		const albumName = track.album
		// In a future we should handle ability to view multiple artists
		const artistName = track.artists[0]

		type FalsyValue = false | undefined | null | ''
		const predefinedMenuItemsList: (PredefinedMenuItem | FalsyValue)[] = [
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
			albumName && {
				predefinedKey: 'viewAlbum',
				label: m.trackViewAlbum(),
				action: () => {
					void viewRelated('albums', albumName)
				},
			},
			artistName && {
				predefinedKey: 'viewArtist',
				label: m.trackViewArtist(),
				action: () => {
					void viewRelated('artists', artistName)
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

		const predefinedItems = predefinedMenuItemsList.filter((item) => {
			if (!item) {
				return false
			}

			// By default, all predefined menu items are enabled.
			const isExplicitlyDisabled = predefinedMenuItems[item.predefinedKey] === false

			return !isExplicitlyDisabled
		}) as MenuItem[]

		return [...predefinedItems, ...(menuItems ? menuItems(track, index) : [])]
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
			menuItems={(track) => getMenuItems(track, item.index)}
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
