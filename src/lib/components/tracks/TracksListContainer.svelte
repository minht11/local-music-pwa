<script lang="ts" module>
	import { onNavigate } from '$app/navigation'
	import type { TrackData } from '$lib/library/get/value.ts'
	import Button from '../Button.svelte'
	import IconButton from '../IconButton.svelte'
	import MenuButton from '../MenuButton.svelte'
	import type { MenuItem } from '../menu/types.ts'
	import VirtualContainer, { type RowSize } from '../VirtualContainer.svelte'
	import type { SelectionSnapshot, TrackRowIdentity } from './selection.ts'
	import TrackListItem from './TrackListItem.svelte'
	import { useTrackDragController } from './use-track-drag-controller.svelte.ts'
	import {
		type PredefinedTrackMenuItemVisibility,
		type TrackRowLocator,
		useTrackMenuItems,
	} from './use-track-menu-items.ts'
	import { useTrackSelectionController } from './use-track-selection-controller.svelte.ts'

	export interface TrackItemClick extends TrackRowLocator {
		track: TrackData
	}

	/**
	 * Where rows come from, resolved on demand so nothing materializes the full
	 * list. `createTrackRowsSource` covers any flat list; sectioned lists build
	 * their own.
	 */
	export interface TrackListSource {
		/** Total row count, track and custom rows alike. */
		count: number
		/** The track row at `index`, or undefined for a custom or stale row. */
		trackAt: (index: number) => TrackRowIdentity | undefined
		/** Whether this row is the one playing (shows the playing indicator). */
		isRowActive: (row: TrackRowIdentity) => boolean
		onItemClick: (data: TrackItemClick) => void
		/**
		 * A constant, or `{ at, key }` (see `VariableRowSize`). `at` re-runs for
		 * every index on any count change, so it must stay allocation-free.
		 */
		size: RowSize
		/**
		 * A row's key, answered without building the row. For a track row this *is*
		 * its `entryId` — one identity shared by virtualizer reconciliation, selection
		 * and drag. A custom row carries no identity and answers a constant of its own,
		 * which must not be a number.
		 */
		keyAt: (index: number) => string | number
	}

	export interface TracksListContainerProps {
		/** A stable object whose fields are getters, read at access time. */
		source: TrackListSource
		predefinedMenuItems?: PredefinedTrackMenuItemVisibility
		menuItems?: (track: TrackData, row: TrackRowLocator) => MenuItem[]
		multiSelectMenuItems?: (selection: SelectionSnapshot) => MenuItem[]
		showFavoriteButton?: boolean
		customRow?: Snippet<[number]>
		/**
		 * Supplying this makes track rows draggable; custom rows never are. Receives
		 * the dragged entry id plus the raw insert slot (a gap between rows, 0..count).
		 */
		onDrop?: (entryId: number, insertSlot: number) => void
	}
</script>

<script lang="ts">
	const player = usePlayer()

	const {
		source,
		customRow,
		menuItems,
		multiSelectMenuItems,
		predefinedMenuItems = {},
		showFavoriteButton = true,
		onDrop,
	}: TracksListContainerProps = $props()

	const isReorderable = $derived(onDrop !== undefined)

	const rowCount = $derived(source.count)

	const { getMenuItems, getMultiSelectMenuItems } = useTrackMenuItems(
		() => menuItems,
		() => predefinedMenuItems,
		() => multiSelectMenuItems,
	)

	// Numeric row keys are the live entry ids. Lazy — only selection reads it.
	const liveEntryIds = $derived.by(() => {
		const ids = new Set<number>()
		for (let index = 0; index < rowCount; index += 1) {
			const key = source.keyAt(index)
			if (typeof key === 'number') {
				ids.add(key)
			}
		}

		return ids
	})

	const selection = useTrackSelectionController({
		rowCount: () => rowCount,
		trackAt: (index) => source.trackAt(index),
		hasEntry: (entryId) => liveEntryIds.has(entryId),
	})

	const dragController = useTrackDragController({
		itemsCount: () => rowCount,
		onDrop: ({ entryId }, insertSlot) => {
			onDrop?.(entryId, insertSlot)
		},
		onStart: () => selection.cancelSelection(),
	})

	const selectionSnackbarId = $props.id()

	onNavigate(() => {
		// Its snippet renders outside this route branch, so release it before route data changes.
		selection.cancelSelection()
		snackbar.dismiss(selectionSnackbarId)
	})

	$effect(() => {
		if (!selection.selectionEnabled) {
			snackbar.dismiss(selectionSnackbarId)
			return
		}

		snackbar({
			id: selectionSnackbarId,
			message: '',
			duration: false,
			order: 'end',
			controls: {
				type: 'snippet',
				snippet: multiselectPane,
			},
		})

		return () => snackbar.dismiss(selectionSnackbarId)
	})
</script>

{#snippet multiselectPane()}
	<div
		class="pointer-events-auto col-2 flex w-full items-center gap-1 rounded-lg bg-inverseSurface p-2 py-1 text-inverseOnSurface"
	>
		<MenuButton
			menuItems={() => getMultiSelectMenuItems(selection.snapshot)}
			alignment={{ horizontal: 'left', vertical: 'bottom' }}
		/>

		<div class="rounded-md bg-primary px-2 py-1">
			{m.selectedCount({ count: selection.size })}
		</div>

		<Button
			kind="flat"
			class="ml-auto text-inversePrimary! disabled:text-inverseOnSurface/50!"
			disabled={selection.size === liveEntryIds.size}
			onclick={() => {
				selection.selectAll()
			}}
		>
			{m.selectAll()}
		</Button>

		<IconButton
			tooltip={m.cancel()}
			icon="close"
			onclick={() => {
				selection.cancelSelection()
			}}
		/>
	</div>
{/snippet}

<VirtualContainer
	size={source.size}
	count={rowCount}
	forceRenderIndexes={dragController.drag === null ? [] : [dragController.drag.fromIndex]}
	focusableRow={(index) => source.trackAt(index) !== undefined}
	key={source.keyAt}
>
	{#snippet children(item)}
		{@const row = source.trackAt(item.index)}
		{@const drag = dragController.drag}

		{#if row === undefined}
			<div
				role="row"
				style={`transform: translateY(${item.start}px); height: ${item.size}px`}
				class="virtual-item top-0 left-0 w-full"
				data-row-index={item.index}
				aria-rowindex={item.index + 1}
			>
				{@render customRow?.(item.index)}
			</div>
		{:else}
			{@const active = source.isRowActive(row)}

			<TrackListItem
				trackId={row.trackId}
				{active}
				activePlaying={player.playing && active}
				style={`transform: translateY(${item.start}px)`}
				class={[
					'virtual-item top-0 left-0 w-full',
					drag !== null && 'no-drag-hover hover:bg-transparent!',
				]}
				rowIndex={item.index}
				selectionEnabled={selection.selectionEnabled}
				selectionHover={selection.isInHoverRange(item.index)}
				selected={selection.has(row.entryId)}
				showReorderButton={isReorderable}
				{showFavoriteButton}
				reorderDragging={drag?.row.entryId === row.entryId}
				reorderInsertBefore={drag !== null && drag.insertIndex === item.index}
				reorderInsertAfter={drag !== null && drag.insertIndex === item.index + 1}
				menuItems={(track) => getMenuItems(track, { index: item.index, entryId: row.entryId })}
				onclick={(track, e) => {
					selection.handleItemClick({
						event: e,
						entryId: row.entryId,
						trackId: row.trackId,
						index: item.index,
						onClick: () => {
							source.onItemClick({
								track,
								index: item.index,
								entryId: row.entryId,
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
					selection.toggleSelection(row.entryId, row.trackId, item.index)
				}}
				onReorderPointerDown={(e) => {
					dragController.handlePointerDown(item.index, row, e)
				}}
			/>
		{/if}
	{/snippet}
</VirtualContainer>

{#if dragController.drag !== null}
	{@const drag = dragController.drag}
	{@const previewActive = source.isRowActive(drag.row)}
	<div
		popover="manual"
		aria-hidden="true"
		class="drag-preview-popover @container opacity-80"
		style={`top:${drag.preview.top}px;left:${drag.preview.left}px;width:${drag.preview.width}px;`}
		{@attach (el) => {
			el.showPopover()
		}}
	>
		<TrackListItem
			trackId={drag.row.trackId}
			active={previewActive}
			activePlaying={player.playing && previewActive}
			class="pointer-events-none bg-surfaceContainerHigh shadow-lg"
			rowIndex={drag.fromIndex}
			selectionEnabled={selection.selectionEnabled}
			selectionHover={false}
			selected={selection.has(drag.row.entryId)}
			menuItems={(track) =>
				getMenuItems(track, { index: drag.fromIndex, entryId: drag.row.entryId })}
			showReorderButton={isReorderable}
			{showFavoriteButton}
			reorderDragging={false}
			reorderInsertBefore={false}
			reorderInsertAfter={false}
		/>
	</div>
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
