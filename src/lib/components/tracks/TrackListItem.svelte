<script lang="ts">
	import type { Track } from '$lib/db/entities'
	import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'

	import { formatDuration } from '$lib/helpers/utils'
	import { useTrack } from '$lib/library/tracks.svelte.ts'
	import Artwork from '../Artwork.svelte'
	import ListItem, { type ListMenuFn } from '../ListItem.svelte'

	interface Props {
		trackId: number
		style?: string
		ariaRowIndex?: number
		active?: boolean
		class?: string
		menuItems?: ListMenuFn
		onclick?: (track: Track) => void
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

	const data = useTrack(trackId)

	const [artwork] = createManagedArtwork(() => data.value?.images?.small)
	const track = $derived(data.value)
</script>

<ListItem
	{style}
	{menuItems}
	tabindex={-1}
	class={clx(
		'h-72px text-left',
		active ? 'bg-onSurfaceVariant/10 text-onSurfaceVariant' : 'color-onSurfaceVariant',
		className,
	)}
	ariaLabel={`Play ${track?.name}`}
	{ariaRowIndex}
	onclick={() => onclick?.(track!)}
>
	<div role="cell" class="track-item grow gap-20px items-center">
		<Artwork
			src={artwork()}
			alt={track?.name}
			class={clx('h-40px w-40px rounded-4px', data.loading && 'opacity-50')}
		/>

		{#if data.loading === true}
			<div>
				<div class="h-8px rounded-2px bg-onSurface/10 mb-8px"></div>
				<div class="h-4px rounded-2px bg-onSurface/10 w-80%"></div>
			</div>
		{:else if data.error}
			Error loading track
		{:else if track}
			<div class="flex flex-col">
				<div class={clx(active ? 'text-primary' : 'color-onSurface')}>
					{track.name}
				</div>
				<div>
					{track.artists.join(', ')}
				</div>
			</div>

			<div class="hidden @4xl:block">
				{track.album}
			</div>

			<div class="hidden @sm:block tabular-nums">
				{formatDuration(track.duration)}
			</div>
		{/if}
	</div>
</ListItem>

<style lang="postcss">
	.track-item {
		--grid-cols: auto 1fr;
		display: grid;
		grid-template-columns: var(--grid-cols);
	}

	@container (theme('containers.sm')) {
		.track-item {
			--grid-cols: auto 1.5fr 74px;
		}
	}

	@container (theme('containers.4xl')) {
		.track-item {
			--grid-cols: auto 1.5fr minmax(200px, 1fr) 74px;
		}
	}
</style>
