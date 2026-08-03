<script lang="ts" module>
	import { useSetOverlaySnippet } from '$lib/layout-bottom-bar.svelte.ts'
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

	/**
	 * `entryId` is the stable per-row id — the unit of virtualizer reconciliation,
	 * selection and drag.
	 */
	export type TrackListRow =
		| { type: 'track'; entryId: number; trackId: number }
		| { type: 'custom' }

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
		/** Excludes custom rows; used by "select all". */
		trackCount: number
		rowAt: (index: number) => TrackListRow
		/** Whether this row is the one playing (shows the playing indicator). */
		isRowActive: (row: TrackRowIdentity) => boolean
		onItemClick: (data: TrackItemClick) => void
		/**
		 * A constant, or `{ at, key }` (see `VariableRowSize`). `at` re-runs for
		 * every index on any count change, so it must stay allocation-free.
		 */
		size: RowSize
		/** A row's key, answered without building the row — a custom row carries no identity. */
		keyAt: (index: number) => string | number
		/**
		 * Whether `entryId` still names a row. The selection prunes through this on
		 * every list change, so sources answer from a derived set, never a scan.
		 */
		hasEntry: (entryId: number) => boolean
	}

	export interface TracksListContainerProps {
		/** A stable object whose fields are getters, read at access time. */
		source: TrackListSource
		predefinedMenuItems?: PredefinedTrackMenuItemVisibility
		menuItems?: (track: TrackData, row: TrackRowLocator) => MenuItem[]
		multiSelectMenuItems?: (selection: SelectionSnapshot) => MenuItem[]
		showReorderButton?: (index: number) => boolean
		showFavoriteButton?: boolean
		customRow?: Snippet<[number]>
		/**
		 * The dragged row plus the raw insert slot (a gap between rows, 0..count).
		 * Only fires while `row.index` still resolves to the row the gesture started on.
		 */
		onDrop?: (row: TrackRowLocator, insertSlot: number) => void
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
		showReorderButton,
		showFavoriteButton = true,
		onDrop,
	}: TracksListContainerProps = $props()

	// Bounds-checked, unlike `source.rowAt`: callers hold indexes the list can shrink under.
	const trackAt = (index: number): TrackRowIdentity | undefined => {
		if (index < 0 || index >= source.count) {
			return undefined
		}

		const row = source.rowAt(index)

		return row.type === 'track' ? row : undefined
	}

	const isRowReorderable = (index: number) => showReorderButton?.(index) ?? false

	/** A list that mutates mid-drag (the queue advances on track end) invalidates the drop. */
	const isDropStillValid = (fromIndex: number, entryId: number): boolean =>
		trackAt(fromIndex)?.entryId === entryId

	const { getMenuItems, getMultiSelectMenuItems } = useTrackMenuItems(
		() => menuItems,
		() => predefinedMenuItems,
		() => multiSelectMenuItems,
	)

	const selection = useTrackSelectionController({
		rowCount: () => source.count,
		trackAt,
		hasEntry: (entryId) => source.hasEntry(entryId),
	})

	const dragController = useTrackDragController({
		itemsCount: () => source.count,
		onDrop: ({ entryId }, fromIndex, insertSlot) => {
			if (isDropStillValid(fromIndex, entryId)) {
				onDrop?.({ index: fromIndex, entryId }, insertSlot)
			}
		},
		onStart: () => selection.cancelSelection(),
	})

	useSetOverlaySnippet('above-player', () => (selection.selectionEnabled ? multiselectPane : null))
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
			disabled={selection.size === source.trackCount}
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
	count={source.count}
	forceRenderIndexes={dragController.drag === null ? [] : [dragController.drag.fromIndex]}
	focusableRow={(index) => source.rowAt(index).type === 'track'}
	key={source.keyAt}
>
	{#snippet children(item)}
		{@const row = source.rowAt(item.index)}
		{@const drag = dragController.drag}

		{#if row.type === 'custom'}
			<div
				role="row"
				style={`transform: translateY(${item.start}px); height: ${item.size}px`}
				class="virtual-item top-0 left-0 w-full"
				aria-rowindex={item.index}
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
				ariaRowIndex={item.index}
				selectionEnabled={selection.selectionEnabled}
				selectionHover={selection.isInHoverRange(item.index)}
				selected={selection.has(row.entryId)}
				showReorderButton={isRowReorderable(item.index)}
				{showFavoriteButton}
				reorderDragging={drag?.fromIndex === item.index}
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
			ariaRowIndex={drag.fromIndex}
			selectionEnabled={selection.selectionEnabled}
			selectionHover={false}
			selected={selection.has(drag.row.entryId)}
			menuItems={(track) =>
				getMenuItems(track, { index: drag.fromIndex, entryId: drag.row.entryId })}
			showReorderButton={isRowReorderable(drag.fromIndex)}
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
