<script lang="ts" module>
	import { useSetOverlaySnippet } from '$lib/layout-bottom-bar.svelte.ts'
	import type { TrackData } from '$lib/library/get/value.ts'
	import Button from '../Button.svelte'
	import IconButton from '../IconButton.svelte'
	import MenuButton from '../MenuButton.svelte'
	import type { MenuItem } from '../menu/types.ts'
	import VirtualContainer from '../VirtualContainer.svelte'
	import TrackListItem from './TrackListItem.svelte'
	import { type PredefinedTrackMenuItemOption, useTrackMenuItems } from './use-track-menu-items.ts'
	import { useTrackSelectionController } from './use-track-selection-controller.svelte.ts'
	export interface TrackItemClick {
		track: TrackData
		items: readonly number[]
		index: number
	}

	interface Props {
		items: readonly number[]
		predefinedMenuItems?: Partial<Record<PredefinedTrackMenuItemOption, boolean>>
		menuItems?: (track: TrackData, index: number) => MenuItem[]
		onItemClick?: (data: TrackItemClick) => void
	}
</script>

<script lang="ts">
	const player = usePlayer()

	const defaultOnItemClick = (data: TrackItemClick) => {
		player.playTrack(data.index, data.items)
	}

	const {
		items,
		menuItems,
		predefinedMenuItems = {},
		onItemClick = defaultOnItemClick,
	}: Props = $props()

	const { getMenuItems, getMultiSelectMenuItems } = useTrackMenuItems(
		() => menuItems,
		() => predefinedMenuItems,
	)

	const selection = useTrackSelectionController({
		items: () => items,
	})

	$effect(() => {
		void items
		void items.length

		untrack(() => {
			selection.cancelSelection()
		})
	})

	useSetOverlaySnippet('above-player', () => (selection.selectionEnabled ? multiselectPane : null))
</script>

<svelte:document
	onkeydown={(e) => {
		selection.handleDocumentKeyDown(e)
	}}
	onkeyup={(e) => {
		selection.handleDocumentKeyUp(e)
	}}
/>

{#snippet multiselectPane()}
	<div
		class="pointer-events-auto col-2 flex w-full items-center gap-1 rounded-lg bg-inverseSurface p-2 py-1 text-inverseOnSurface"
	>
		<MenuButton
			menuItems={() => getMultiSelectMenuItems(selection.selectedIds)}
			alignment={{ horizontal: 'left', vertical: 'bottom' }}
		/>

		<div class="rounded-md bg-primary px-2 py-1">
			{m.selectedCount({ count: selection.size })}
		</div>

		<Button
			kind="flat"
			class="ml-auto text-inversePrimary! disabled:text-inverseOnSurface/50!"
			disabled={selection.size === items.length}
			onclick={() => {
				selection.selectMany(items)
			}}
		>
			{m.selectAll()}
		</Button>

		<IconButton
			tooltip={m.libraryAddToPlaylist()}
			icon="close"
			onclick={() => {
				selection.cancelSelection()
			}}
		/>
	</div>
{/snippet}

<VirtualContainer size={72} count={items.length} key={(index) => `${items[index]}-${index}`}>
	{#snippet children(item)}
		{@const trackId = items[item.index] as number}
		{@const active = player.activeTrack?.id === trackId}

		<TrackListItem
			{trackId}
			{active}
			activePlaying={player.playing && active}
			style="transform: translateY({item.start}px)"
			class="virtual-item top-0 left-0 w-full"
			ariaRowIndex={item.index}
			selectionEnabled={selection.selectionEnabled}
			selectionHover={selection.isInHoverRange(item.index)}
			selected={selection.has(trackId)}
			menuItems={(track) => getMenuItems(track, item.index)}
			onclick={(track, e) => {
				selection.handleItemClick({
					event: e,
					trackId,
					index: item.index,
					onClick: () => {
						onItemClick({
							track,
							items,
							index: item.index,
						})
					},
				})
			}}
			onpointerenter={() => {
				selection.handlePointerEnter(item.index)
			}}
			toggleSelection={() => {
				selection.toggleSelection(trackId, item.index)
			}}
		/>
	{/snippet}
</VirtualContainer>
