<script lang="ts">
	import { type TrackData, createTrackQuery } from '$lib/db/entity'
	import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'
	import { formatDuration } from '$lib/helpers/utils/format-duration.ts'
	import { toggleFavoriteTrack } from '$lib/library/playlists.svelte'
	import invariant from 'tiny-invariant'
	import Artwork from '../Artwork.svelte'
	import IconButton from '../IconButton.svelte'
	import ListItem, { type MenuItem } from '../ListItem.svelte'

	interface Props {
		trackId: number
		style?: string
		ariaRowIndex?: number
		active?: boolean
		class?: string
		menuItems?: (playlist: TrackData) => MenuItem[]
		onclick?: (track: TrackData) => void
	}

	const {
		trackId,
		style,
		active,
		class: className,
		onclick,
		ariaRowIndex,
		menuItems,
	}: Props = $props()

	const data = createTrackQuery(() => trackId)

	const artworkSrc = createManagedArtwork(() => data.value?.images?.small)
	const track = $derived(data.value)

	const menuItemsWithItem = $derived(
		menuItems &&
			(() => {
				invariant(track)

				return menuItems?.(track)
			}),
	)
</script>

<ListItem
	{style}
	menuItems={menuItemsWithItem}
	tabindex={-1}
	class={clx(
		'h-18 text-left',
		active ? 'bg-onSurfaceVariant/10 text-onSurfaceVariant' : 'color-onSurfaceVariant',
		className,
	)}
	ariaLabel={`Play ${track?.name}`}
	{ariaRowIndex}
	onclick={() => onclick?.(track!)}
>
	<div role="cell" class="track-item grow items-center gap-5">
		<Artwork
			src={artworkSrc()}
			alt={track?.name}
			class={clx('!hidden h-10 w-10 rounded-sm @sm:!flex', data.loading && 'opacity-50')}
		/>

		{#if data.loading === true}
			<div>
				<div class="mb-2 h-2 rounded-xs bg-onSurface/10"></div>
				<div class="h-1 w-1/8 rounded-xs bg-onSurface/10"></div>
			</div>
		{:else if data.error}
			<!-- TODO. Alow removing failed tracks -->
			<div class="text-error">
				Error loading track with id {trackId}
			</div>
		{:else if track}
			<div class="flex flex-col truncate">
				<div class={clx(active ? 'text-primary' : 'color-onSurface', 'truncate')}>
					{track.name}
				</div>
				<div class="truncate overflow-hidden">
					{track.artists.join(', ')}
				</div>
			</div>

			<div class="hidden @4xl:block">
				{track.album}
			</div>

			<div class="hidden tabular-nums @sm:block">
				{formatDuration(track.duration)}
			</div>

			<IconButton
				class="hidden @sm:flex"
				tabindex={-1}
				icon={track.favorite ? 'favorite' : 'favoriteOutline'}
				onclick={(e) => {
					e.stopPropagation()
					void toggleFavoriteTrack(track.favorite, track.id)
				}}
			/>
		{/if}
	</div>
</ListItem>

<style>
	.track-item {
		--grid-cols: auto 1fr;
		display: grid;
		grid-template-columns: var(--grid-cols);
	}

	@container (min-width: 24rem) {
		.track-item {
			--grid-cols: auto 1.5fr 74px 44px;
		}
	}

	/* @container (theme('containers.4xl')) { */
	@container (min-width: 56rem) {
		.track-item {
			--grid-cols: auto 1.5fr minmax(200px, 1fr) 74px 44px;
		}
	}
</style>
