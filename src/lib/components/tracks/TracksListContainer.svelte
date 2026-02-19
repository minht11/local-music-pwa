<script lang="ts" module>
	import { isPrimaryModifierKey } from '$lib/helpers/utils/ua.ts'
	import { useSetOverlaySnippet } from '$lib/layout-bottom-bar.svelte.ts'
	import type { TrackData } from '$lib/library/get/value.ts'
	import Button from '../Button.svelte'
	import IconButton from '../IconButton.svelte'
	import MenuButton from '../MenuButton.svelte'
	import type { MenuItem } from '../menu/types.ts'
	import VirtualContainer from '../VirtualContainer.svelte'
	import { SelectionTracker } from './selection.svelte.ts'
	import TrackListItem from './TrackListItem.svelte'
	import { type PredefinedTrackMenuItemOption, useTrackMenuItems } from './use-track-menu-items.ts'
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

	const selection = new SelectionTracker()

	let hoverRangeEnd = $state<number | null>(null)
	let hoverRangeAnchor = $state<number | null>(null)
	let isShiftActive = $state(false)

	const cancelSelection = () => {
		selection.clear()
		hoverRangeEnd = null
		hoverRangeAnchor = null
	}

	$effect(() => {
		void items
		void items.length

		untrack(() => {
			cancelSelection()
		})
	})

	useSetOverlaySnippet('above-player', () => (selection.selectionEnabled ? multiselectPane : null))

	const documentKeyDownHandler = (e: KeyboardEvent) => {
		if (e.key === 'Shift') {
			isShiftActive = true
		}

		// Only handle these shortcuts when in selection mode
		if (!selection.selectionEnabled) {
			return
		}

		if (e.key === 'Escape') {
			cancelSelection()
		}

		// Handle Cmd/Ctrl+A for select all
		if (e.key === 'a' && isPrimaryModifierKey(e)) {
			e.preventDefault()
			selection.selectMany(items)
		}
	}

	const documentKeyUpHandler = (e: KeyboardEvent) => {
		if (e.key === 'Shift') {
			isShiftActive = false
			hoverRangeAnchor = null
		}
	}

	const isInHoverRange = (index: number) => {
		if (!isShiftActive || hoverRangeEnd === null) {
			return false
		}

		// Use lastSelectedIndex if it exists, otherwise use hoverRangeAnchor
		const anchor = selection.lastSelectedIndex ?? hoverRangeAnchor

		if (anchor === null) {
			return false
		}

		const min = Math.min(anchor, hoverRangeEnd)
		const max = Math.max(anchor, hoverRangeEnd)

		return index >= min && index <= max
	}
</script>

<svelte:document onkeydown={documentKeyDownHandler} onkeyup={documentKeyUpHandler} />

{#snippet multiselectPane()}
	<div
		class="pointer-events-auto col-2 flex w-full items-center gap-1 rounded-lg bg-inverseSurface p-2 py-1 text-inverseOnSurface"
	>
		<MenuButton
			menuItems={() => getMultiSelectMenuItems(selection.selectedIds)}
			alignment={{ horizontal: 'left', vertical: 'bottom' }}
		/>

		<div class="rounded-md bg-primary px-2 py-1">Selected {selection.size}</div>

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
				cancelSelection()
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
			selectionHover={isInHoverRange(item.index)}
			selected={selection.has(trackId)}
			menuItems={(track) => getMenuItems(track, item.index)}
			onclick={(track, e) => {
				// Handle Cmd/Ctrl-click to toggle selection
				if (isPrimaryModifierKey(e)) {
					e.preventDefault()

					selection.toggle(trackId, item.index)
					return
				}

				// Handle Shift-click for range selection/deselection
				if (e.shiftKey) {
					e.preventDefault()
					if (!selection.selectionEnabled) {
						selection.selectionEnabled = true
					}

					// Toggle range from last selected index to current
					if (selection.lastSelectedIndex !== null) {
						const min = Math.min(selection.lastSelectedIndex, item.index)
						const max = Math.max(selection.lastSelectedIndex, item.index)
						const rangeIds: number[] = []

						let allSelected = true
						for (let i = min; i <= max; i++) {
							const itemAtIndex = items[i]
							if (itemAtIndex !== undefined) {
								rangeIds.push(itemAtIndex)
								if (allSelected && !selection.has(itemAtIndex)) {
									allSelected = false
								}
							}
						}

						if (allSelected) {
							// Unselect all in range
							selection.unselectMany(rangeIds)
						} else {
							// Select all in range
							selection.selectMany(rangeIds)
						}

						// Update last selected index to current position
						selection.lastSelectedIndex = item.index
					} else {
						// No previous selection, just select this one
						selection.select(trackId, item.index)
					}
					return
				}

				// Normal click - if selection mode is active, toggle selection
				if (selection.selectionEnabled) {
					selection.toggle(trackId, item.index)
					return
				}

				onItemClick({
					track,
					items,
					index: item.index,
				})
			}}
			onpointerenter={() => {
				// Update hover index when shift is active (for preview) or when in selection mode
				if (isShiftActive || selection.selectionEnabled) {
					hoverRangeEnd = item.index

					// Set anchor on first hover when shift is active and no selection exists
					if (isShiftActive && hoverRangeAnchor === null && selection.lastSelectedIndex === null) {
						hoverRangeAnchor = item.index
					}
				}
			}}
			toggleSelection={() => {
				selection.toggle(trackId, item.index)
			}}
		/>
	{/snippet}
</VirtualContainer>
