<script lang="ts" module>
	import { useSetOverlaySnippet } from '$lib/layout-bottom-bar.svelte.ts'
	import type { TrackData } from '$lib/library/get/value.ts'
	import Button from '../Button.svelte'
	import IconButton from '../IconButton.svelte'
	import MenuButton from '../MenuButton.svelte'
	import type { MenuItem } from '../menu/types.ts'
	import VirtualContainer from '../VirtualContainer.svelte'
	import TrackListItem from './TrackListItem.svelte'
	import { useTrackDragController } from './use-track-drag-controller.svelte.ts'
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
		reorderEnabled?: boolean
		favoriteEnabled?: boolean
		onReorder?: (fromIndex: number, toIndex: number) => void
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
		reorderEnabled = false,
		favoriteEnabled = true,
		onReorder,
	}: Props = $props()

	const { getMenuItems, getMultiSelectMenuItems } = useTrackMenuItems(
		() => menuItems,
		() => predefinedMenuItems,
	)

	const selection = useTrackSelectionController({
		items: () => items,
	})

	const dragController = useTrackDragController({
		items: () => items,
		onReorder: (from, to) => onReorder?.(from, to),
		onStart: () => selection.cancelSelection(),
	})

	$effect(() => {
		void items
		void items.length

		untrack(() => {
			selection.cancelSelection()
		})
	})

	$effect(() => () => dragController.stop())

	useSetOverlaySnippet('above-player', () => (selection.selectionEnabled ? multiselectPane : null))
</script>

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

<VirtualContainer
	size={72}
	count={items.length}
	forceRenderIndexes={dragController.drag === null ? [] : [dragController.drag.fromIndex]}
	key={(index) => `${items[index]}-${index}`}
>
	{#snippet children(item)}
		{@const trackId = items[item.index] as number}
		{@const active = player.activeTrack?.id === trackId}
		{@const drag = dragController.drag}

		<TrackListItem
			{trackId}
			{active}
			activePlaying={player.playing && active}
			style={`transform: translateY(${item.start}px)`}
			class={[
				'virtual-item top-0 left-0 w-full',
				drag !== null && 'no-drag-hover hover:bg-transparent!',
			]}
			ariaRowIndex={item.index}
			selectionEnabled={selection.selectionEnabled}
			selectionHover={selection.isInHoverRange(item.index)}
			selected={selection.has(trackId)}
			{reorderEnabled}
			{favoriteEnabled}
			reorderDragging={drag?.fromIndex === item.index}
			reorderInsertBefore={drag !== null && drag.insertIndex === item.index}
			reorderInsertAfter={drag !== null && drag.insertIndex === item.index + 1}
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
				if (dragController.drag === null) {
					selection.handlePointerEnter(item.index)
				}
			}}
			toggleSelection={() => {
				selection.toggleSelection(trackId, item.index)
			}}
			onReorderPointerDown={(e) => {
				dragController.start(item.index, e)
			}}
		/>
	{/snippet}
</VirtualContainer>

{#if dragController.drag !== null}
	{@const drag = dragController.drag}
	{@const previewTrackId = items[drag.fromIndex]}
	{#if previewTrackId !== undefined}
		<div
			popover="manual"
			class="drag-preview-popover @container opacity-80"
			style={`top:${drag.preview.top}px;left:${drag.preview.left}px;width:${drag.preview.width}px;`}
			{@attach (el) => {
				el.showPopover()
			}}
		>
			<TrackListItem
				trackId={previewTrackId}
				active={player.activeTrack?.id === previewTrackId}
				activePlaying={player.playing && player.activeTrack?.id === previewTrackId}
				class="pointer-events-none z-40 bg-surfaceContainerHigh shadow-lg"
				ariaRowIndex={drag.fromIndex}
				selectionEnabled={selection.selectionEnabled}
				selectionHover={false}
				selected={selection.has(previewTrackId)}
				menuItems={(track) => getMenuItems(track, drag.fromIndex)}
				{reorderEnabled}
				{favoriteEnabled}
				reorderDragging={false}
				reorderInsertBefore={false}
				reorderInsertAfter={false}
			/>
		</div>
	{/if}
{/if}

<style lang="postcss">
	:global(.no-drag-hover .interactable) {
		pointer-events: none;
	}

	.drag-preview-popover {
		margin: 0;
		padding: 0;
		border: none;
		background: transparent;
		position: fixed;
		inset: auto;
		overflow: visible;
		pointer-events: none;
	}
</style>
