<script lang="ts">
	import { ripple } from '$lib/actions/ripple'
	import type { Track } from '$lib/db/entities'
	import { createManagedArtwork } from '$lib/helpers/create-managed-artwork.svelte'

	import { formatDuration } from '$lib/helpers/utils'
	import { removeTrack, useTrack } from '$lib/library/tracks.svelte.ts'
	import { usePlayer } from '$lib/stores/player/store.ts'
	import Artwork from '../Artwork.svelte'
	import IconButton from '../IconButton.svelte'

	const { trackId, style, tabindex, onclick } = $props<{
		trackId: number
		style?: string
		tabindex?: number
		onclick?: (track: Track) => void
	}>()

	const data = useTrack(trackId)

	const player = usePlayer()

	const isActive = () => {
		const activeTrackId = player.activeTrack.value?.id

		return Boolean(activeTrackId && activeTrackId === data.value?.id)
	}

	const active = $derived(isActive())

	const [artwork] = createManagedArtwork(() => data.value?.images?.small)
	const track = $derived(data.value)
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex a11y-no-noninteractive-element-interactions -->
<div
	{style}
	class={clx(
		'h-72px relative overflow-hidden track-item px-16px items-center grow gap-20px cursor-pointer hover:bg-onSurface/10 rounded-8px',
		active ? 'bg-surfaceVariant text-onSurfaceVariant' : 'color-onSurfaceVariant',
	)}
	{tabindex}
	role="listitem"
	onclick={() => onclick?.(data.value!)}
	onkeydown={(e) => {
		if (e.key === 'Enter') {
			onclick?.(data.value!)
		}
	}}
>
	<Artwork src={artwork()} alt={track?.name} class={clx('h-40px w-40px rounded-4px')} />

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

		<IconButton
			icon="moreVertical"
			onclick={(e) => {
				e.stopPropagation()

				removeTrack(track.id)
			}}
		/>
	{/if}
</div>

<style lang="postcss">
	.track-item {
		--grid-cols: auto 1.5fr 44px;
		display: grid;
		grid-template-columns: var(--grid-cols);
	}

	@container (theme('containers.sm')) {
		.track-item {
			--grid-cols: auto 1.5fr 74px 44px;
		}
	}

	@container (theme('containers.4xl')) {
		.track-item {
			--grid-cols: auto 1.5fr minmax(200px, 1fr) 74px 44px;
		}
	}
</style>
