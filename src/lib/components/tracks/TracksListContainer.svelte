<script lang="ts" module>
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import type { TrackData } from '$lib/library/get/value.ts'
	import { canPlayTrackFile } from '$lib/rajneesh/hooks/can-play-track.ts'
	import { getRelatedUuid } from '$lib/rajneesh/hooks/get-related-uuid.ts'
	import {
		ensureCompletedTracksLoaded,
		isTrackCompleted,
		markTrackCompleted,
		unmarkTrackCompleted,
	} from '$lib/stores/completed-tracks.svelte.ts'
	import type { MenuItem } from '../ListItem.svelte'
	import { snackbar } from '../snackbar/snackbar.ts'
	import VirtualContainer from '../VirtualContainer.svelte'
	import TrackListItem from './TrackListItem.svelte'

	export type PredefinedTrackMenuItems =
		| 'addToQueue'
		| 'addToPlaylist'
		| 'removeFromLibrary'
		| 'toggleCompleted'
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

	$effect(() => {
		void ensureCompletedTracksLoaded()
	})

	interface PredefinedMenuItem extends MenuItem {
		predefinedKey: PredefinedTrackMenuItems
	}

	const viewRelated = async (store: 'albums' | 'artists', name: string) => {
		try {
			const uuid = await getRelatedUuid(store, name)
			if (!uuid) {
				snackbar({
					id: 'related-not-found',
					message: m.libraryNoResults(),
					duration: 5000,
				})
				return
			}

			const path = resolve('/(app)/library/[[slug=libraryEntities]]/[uuid]', {
				slug: store,
				uuid,
			})

			await goto(path)
		} catch (error) {
			snackbar.unexpectedError(error)
		}
	}

	const getMenuItems = (track: TrackData, index: number) => {
		type FalsyValue = false | undefined | null | ''
		const predefinedMenuItemsList: (PredefinedMenuItem | FalsyValue)[] = [
			{
				predefinedKey: 'addToQueue',
				label: 'Add to Play later',
				action: () => {
					player.addToQueue(track.id)
				},
			},
			{
				predefinedKey: 'toggleCompleted',
				label: isTrackCompleted(track.uuid)
					? m.libraryMarkTrackIncomplete()
					: m.libraryMarkTrackCompleted(),
				action: async () => {
					if (isTrackCompleted(track.uuid)) {
						await unmarkTrackCompleted(track.uuid)
					} else {
						await markTrackCompleted(track.uuid)
					}
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

		return predefinedItems
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
			onclick={async (track) => {
				if (!(await canPlayTrackFile(track.file, track.uuid))) {
					return
				}

				onItemClick({
					track,
					items,
					index: item.index,
				})
			}}
		/>
	{/snippet}
</VirtualContainer>
