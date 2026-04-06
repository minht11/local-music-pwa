<script lang="ts">
	import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'
	import { formatDuration } from '$lib/helpers/utils/format-duration.ts'
	import { formatArtists, formatNameOrUnknown, getItemLanguage } from '$lib/helpers/utils/text.ts'
	import { createTrackQuery, type TrackData } from '$lib/library/get/value-queries.ts'
	import Artwork from '../Artwork.svelte'
	import FavoriteButton from '../FavoriteButton.svelte'
	import IconButton from '../IconButton.svelte'
	import Icon from '../icon/Icon.svelte'
	import ListItem from '../ListItem.svelte'
	import MenuButton from '../MenuButton.svelte'
	import type { MenuItem } from '../menu/types.ts'

	interface Props {
		trackId: number
		style?: string
		ariaRowIndex: number
		active: boolean
		activePlaying: boolean
		class?: ClassValue
		selectionEnabled: boolean
		selectionHover: boolean
		selected: boolean
		showReorderButton?: boolean
		showFavoriteButton?: boolean
		reorderDragging?: boolean
		reorderInsertBefore?: boolean
		reorderInsertAfter?: boolean
		menuItems?: (track: TrackData) => MenuItem[]
		onclick?: (track: TrackData, e: KeyboardEvent | MouseEvent) => void
		onpointerenter?: (e: PointerEvent) => void
		onReorderPointerDown?: (e: PointerEvent) => void
		toggleSelection?: () => void
	}

	const {
		trackId,
		style,
		active,
		activePlaying,
		class: className,
		selectionEnabled,
		selectionHover,
		selected,
		showReorderButton = false,
		showFavoriteButton = true,
		reorderDragging = false,
		reorderInsertBefore = false,
		reorderInsertAfter = false,
		ariaRowIndex: ariaRowIndexProp,
		menuItems,
		onclick,
		onpointerenter,
		onReorderPointerDown,
		toggleSelection,
	}: Props = $props()

	// ariaRowIndexProp rerenders a lot even when it doesn't change
	const ariaRowIndex = $derived(ariaRowIndexProp)

	const query = createTrackQuery(() => trackId)
	const { value: track, loading } = $derived(query)

	const artworkSrc = createManagedArtwork(() => track?.image?.small)

	const menu = useMenu()
	const menuItemsWithItem = $derived(track && menuItems?.bind(null, track))
</script>

<ListItem
	{style}
	tabindex={-1}
	class={[
		'track-item-container group relative h-18 text-left',
		active ? 'bg-onSurfaceVariant/10 text-onSurfaceVariant' : 'color-onSurfaceVariant',
		className,
		selected && 'bg-primary/5',
		selectionHover && 'bg-tertiary/10',
		reorderDragging && 'bg-transparent',
		reorderDragging && 'track-item-container-dragging',
	]}
	ariaLabel={m.trackPlay({ name: track?.name ?? '' })}
	{ariaRowIndex}
	onclick={(e) => {
		if (track) {
			onclick?.(track, e)
		}
	}}
	{onpointerenter}
	oncontextmenu={(e) => {
		if (!menuItemsWithItem) {
			return
		}

		e.preventDefault()

		// On mobile, enter selection mode instead of showing context menu
		if (e.pointerType === 'touch') {
			if (!selectionEnabled) {
				// Enter selection mode and select this item
				toggleSelection?.()
			}

			return
		}

		menu.showFromEvent(e, menuItemsWithItem(), {
			anchor: false,
			position: { top: e.y, left: e.x },
		})
	}}
>
	{#if reorderInsertBefore || reorderInsertAfter}
		<div
			class={[
				'pointer-events-none absolute right-2 left-2 z-20 h-0.5 bg-primary',
				reorderInsertBefore ? 'top-0' : 'bottom-0',
			]}
		></div>
	{/if}

	<div role="gridcell">
		<Artwork
			src={artworkSrc()}
			alt={track?.name}
			class={['mr-4 hidden! h-10 w-10 rounded-sm @xs:flex!', loading && 'opacity-50']}
		>
			{#if activePlaying}
				{@const barClassName = 'playing-bar h-5 w-[3px] origin-bottom rounded-sm bg-[white]'}
				<div class="absolute inset-0 flex items-center justify-center gap-1 bg-scrim/40">
					<span class={barClassName}></span>
					<span class={[barClassName, '[--ani-delay:0.2s]']}></span>
					<span class={[barClassName, '[--ani-delay:0.4s]']}></span>
				</div>
			{/if}
		</Artwork>
	</div>

	{#if loading}
		<div>
			<div class="mb-2 h-2 rounded-xs bg-onSurface/10"></div>
			<div class="h-1 w-1/8 rounded-xs bg-onSurface/10"></div>
		</div>
	{:else if query.error}
		<div class="text-error">
			Error loading track with id {trackId}
		</div>
	{:else if track}
		<div
			role="gridcell"
			class="track-item grow items-center gap-5"
			lang={getItemLanguage(track.language)}
		>
			<div class="flex flex-col truncate">
				<div class={[active ? 'text-primary' : 'color-onSurface', 'truncate']}>
					{track.name}
				</div>
				<div class="truncate overflow-hidden">
					{formatArtists(track.artists)}
				</div>
			</div>

			<div class="hidden @3xl:block">
				{formatNameOrUnknown(track.album)}
			</div>
		</div>

		<div role="gridcell" class="flex gap-1">
			{#if showReorderButton && !selectionEnabled}
				<button
					type="button"
					tabindex={-1}
					class="interactable flex size-11 shrink-0 touch-none items-center justify-center rounded-full"
					onclick={(e) => {
						e.preventDefault()
						e.stopPropagation()
					}}
					onpointerdown={onReorderPointerDown}
				>
					<Icon type="dragHorizontal" />
				</button>
			{/if}

			{#if showFavoriteButton}
				<FavoriteButton
					class={['hidden @sm:flex', selectionEnabled && 'invisible']}
					trackId={track.id}
					favorite={track.favorite}
					tabindex={-1}
				/>
			{/if}

			<MenuButton
				class={[selectionEnabled && 'invisible']}
				tabindex={-1}
				menuItems={menuItemsWithItem}
			/>

			<div
				class={['items-center justify-end gap-1', selectionEnabled ? 'flex' : 'hidden @sm:flex']}
			>
				<div class="relative grid w-11 items-center justify-items-end">
					{#if !selectionEnabled}
						<div
							class="text-right tabular-nums stack-in-grid group-focus-within:opacity-0 group-hover:opacity-0"
						>
							{formatDuration(track.duration)}
						</div>
					{/if}

					<IconButton
						tabindex={-1}
						tooltip={''}
						class={[
							'stack-in-grid',
							selectionEnabled
								? ''
								: 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100',
						]}
						onclick={(e) => {
							// If selection is not enabled, enable it
							// otherwise let parent handle toggling
							if (!selectionEnabled) {
								e.stopPropagation()
								toggleSelection?.()
							}
						}}
					>
						<div
							class={[
								'flex size-5 items-center justify-center rounded-sm border-2',
								selected && 'border-primary bg-primary text-onPrimary',
							]}
						>
							{#if selected}
								<Icon type="check" class="size-5" />
							{/if}
						</div>
					</IconButton>
				</div>
			</div>
		</div>
	{/if}
</ListItem>

<style lang="postcss">
	@reference '../../../app.css';

	:global(.track-item-container-dragging) [role='gridcell'] {
		opacity: 25%;
	}

	.track-item {
		--grid-cols: 1fr;
		display: grid;
		grid-template-columns: var(--grid-cols);
	}

	@container (min-width: theme('container-3xl')) {
		.track-item {
			--grid-cols: 1.5fr minmax(200px, 1fr);
		}
	}

	@keyframes playing-bar {
		0%,
		100% {
			transform: scaleY(0.3);
		}
		50% {
			transform: scaleY(1);
		}
	}

	.playing-bar {
		animation: playing-bar 0.8s ease-in-out infinite var(--ani-delay, 0s) backwards;
	}
</style>
