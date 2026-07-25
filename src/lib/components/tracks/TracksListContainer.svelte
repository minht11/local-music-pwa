<script lang="ts" module>
	import { useSetOverlaySnippet } from '$lib/layout-bottom-bar.svelte.ts'
	import type { TrackData } from '$lib/library/get/value.ts'
	import Button from '../Button.svelte'
	import IconButton from '../IconButton.svelte'
	import MenuButton from '../MenuButton.svelte'
	import type { MenuItem } from '../menu/types.ts'
	import VirtualContainer from '../VirtualContainer.svelte'
	import { TRACK_ROW_HEIGHT } from './row-height.ts'
	import type { SelectionSnapshot, TrackRowIdentity } from './selection.ts'
	import TrackListItem from './TrackListItem.svelte'
	import { useTrackDragController } from './use-track-drag-controller.svelte.ts'
	import {
		type PredefinedTrackMenuItemOption,
		type TrackRowLocator,
		useTrackMenuItems,
	} from './use-track-menu-items.ts'
	import { useTrackSelectionController } from './use-track-selection-controller.svelte.ts'

	/**
	 * A row resolved on demand by index. `entryId` is the stable per-row id — the
	 * unit of virtualizer reconciliation, selection and drag — and `trackId` the
	 * payload. Custom rows (e.g. section headers) carry only a height and a stable
	 * key; the `customRow` snippet resolves their content, keeping row resolution
	 * free of i18n and closures.
	 */
	export type TrackListRow =
		| { type: 'track'; entryId: number; trackId: number }
		| { type: 'custom'; key: string; size: number }

	export interface TrackItemClick extends TrackRowLocator {
		track: TrackData
	}

	/**
	 * Where rows come from, resolved on demand so nothing materializes the full
	 * list. `trackCount` (used by "select all") excludes custom rows, and clicking
	 * a row is the source's business — the container has no default.
	 *
	 * `createTrackIdsSource` covers a plain list of track ids; sectioned lists and
	 * lists that can repeat a track id build their own.
	 */
	export interface TrackListSource {
		/** Total row count, track and custom rows alike. */
		count: number
		trackCount: number
		rowAt: (index: number) => TrackListRow
		/**
		 * Whether this row is the one playing. Most lists compare track ids; the
		 * queue compares entry ids, so a track sitting on several rows lights up
		 * only on the row actually playing.
		 */
		isRowActive: (row: TrackRowIdentity) => boolean
		onItemClick: (data: TrackItemClick) => void
		/**
		 * A row's height and reconciliation key without building the row. A count
		 * change runs the size probe for every index, not just the rendered ones, so
		 * a source that can answer without allocating should. Both fall back to `rowAt`.
		 */
		sizeAt?: (index: number) => number
		keyAt?: (index: number) => string | number
	}

	export interface TracksListContainerProps extends TrackListSource {
		predefinedMenuItems?: Partial<Record<PredefinedTrackMenuItemOption, boolean>>
		menuItems?: (track: TrackData, row: TrackRowLocator) => MenuItem[]
		/** Extra multi-select menu items appended after the predefined ones. */
		multiSelectMenuItems?: (selection: SelectionSnapshot) => MenuItem[]
		showReorderButton?: boolean | ((index: number) => boolean)
		showFavoriteButton?: boolean
		/** Renders a custom (non-track) row, given its index. */
		customRow?: Snippet<[number]>
		/**
		 * The dragged row plus the raw insert slot (a gap between rows, 0..count),
		 * which the consumer maps to a target. Only fires while `row.index` still
		 * resolves to the row the gesture started on, so both fields can be trusted.
		 */
		onDrop?: (row: TrackRowLocator, insertSlot: number) => void
	}
</script>

<script lang="ts">
	// Only for the active row's playing animation; everything else comes from the source.
	const player = usePlayer()

	const {
		count,
		rowAt,
		trackCount,
		isRowActive,
		onItemClick,
		customRow,
		menuItems,
		multiSelectMenuItems,
		predefinedMenuItems = {},
		showReorderButton = false,
		showFavoriteButton = true,
		onDrop,
		sizeAt,
		keyAt,
	}: TracksListContainerProps = $props()

	const rowSize = (index: number): number => {
		if (sizeAt) {
			return sizeAt(index)
		}

		const row = rowAt(index)

		return row.type === 'custom' ? row.size : TRACK_ROW_HEIGHT
	}

	const rowKey = (index: number): string | number => {
		if (keyAt) {
			return keyAt(index)
		}

		const row = rowAt(index)

		return row.type === 'custom' ? row.key : row.entryId
	}

	// Total where `rowAt` is not: callers hold indexes the list can shrink under
	// (the selection's range anchor), and a source may treat those as a bug.
	const trackAt = (index: number): TrackRowIdentity | undefined => {
		if (index < 0 || index >= count) {
			return undefined
		}

		const row = rowAt(index)

		return row.type === 'track' ? row : undefined
	}

	const isRowReorderable = (index: number) =>
		typeof showReorderButton === 'function' ? showReorderButton(index) : showReorderButton

	/**
	 * The dragged row, while `fromIndex` still resolves to it. A list that mutates
	 * mid-drag (the queue advances when a track ends) invalidates both the drop and
	 * the preview.
	 */
	const draggedRowAt = (fromIndex: number, entryId: number): TrackRowIdentity | null => {
		const row = fromIndex >= 0 && fromIndex < count ? rowAt(fromIndex) : null

		return row?.type === 'track' && row.entryId === entryId ? row : null
	}

	const { getMenuItems, getMultiSelectMenuItems } = useTrackMenuItems(
		() => menuItems,
		() => predefinedMenuItems,
		() => multiSelectMenuItems,
	)

	const selection = useTrackSelectionController({
		rowCount: () => count,
		trackAt,
	})

	const dragController = useTrackDragController({
		itemsCount: () => count,
		// A closure, not the prop by value, so `onDrop` is read at call time.
		onDrop: (entryId, fromIndex, insertSlot) => {
			if (draggedRowAt(fromIndex, entryId) !== null) {
				onDrop?.({ index: fromIndex, entryId }, insertSlot)
			}
		},
		onStart: () => selection.cancelSelection(),
	})

	$effect(() => () => dragController.stop())

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
			disabled={selection.size === trackCount}
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
	size={rowSize}
	{count}
	forceRenderIndexes={dragController.drag === null ? [] : [dragController.drag.fromIndex]}
	focusableRow={(index) => rowAt(index).type === 'track'}
	key={rowKey}
>
	{#snippet children(item)}
		{@const row = rowAt(item.index)}
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
			{@const active = isRowActive(row)}

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
							onItemClick({
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
					dragController.start(item.index, row.entryId, e)
				}}
			/>
		{/if}
	{/snippet}
</VirtualContainer>

{#if dragController.drag !== null}
	{@const drag = dragController.drag}
	{@const previewRow = draggedRowAt(drag.fromIndex, drag.entryId)}
	{#if previewRow}
		{@const previewTrackId = previewRow.trackId}
		{@const previewActive = isRowActive(previewRow)}
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
				active={previewActive}
				activePlaying={player.playing && previewActive}
				class="pointer-events-none bg-surfaceContainerHigh shadow-lg"
				ariaRowIndex={drag.fromIndex}
				selectionEnabled={selection.selectionEnabled}
				selectionHover={false}
				selected={selection.has(previewRow.entryId)}
				menuItems={(track) =>
					getMenuItems(track, { index: drag.fromIndex, entryId: previewRow.entryId })}
				showReorderButton={isRowReorderable(drag.fromIndex)}
				{showFavoriteButton}
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
