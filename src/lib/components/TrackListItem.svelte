<script lang="ts" context="module">
	const cache = new WeakMap<Blob, string>()
</script>

<script lang="ts">
	import { ripple } from '$lib/actions/ripple'
	import type { Track } from '$lib/db/entities'

	import { formatDuration } from '$lib/helpers/utils'
	import { useTrack } from '$lib/library/tracks.svelte.ts'

	const { trackId, style, tabindex } = $props<{
		trackId: number
		style?: string
		tabindex?: number
		onclick?: (track: Track) => void
	}>()

	const data = useTrack(trackId)

	const createImageUrl = () => {
		const image = data.track?.image

		if (image && cache.has(image)) {
			return cache.get(image)
		}

		if (image) {
			const url = URL.createObjectURL(image)
			cache.set(image, url)

			return url
		}

		return undefined
	}
	const imageUrl = $derived(createImageUrl())

	// $effect(() => {
	// 	const url = imageUrl

	// 	return () => {
	// 		if (url) {
	// 			URL.revokeObjectURL(url)
	// 		}
	// 	}
	// })
</script>

<div {style} class="h-72px flex flex-col">
	{#if data.loading === true}
		Loading...
	{:else}
		{@const track = data.track}
		<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
		<div
			class="relative overflow-hidden track-item px-16px items-center grow gap-20px cursor-pointer hover:bg-onSurface/10 rounded-8px"
			{tabindex}
			role="listitem"
			use:ripple
		>
			<img class="h-40px w-40px rounded-4px" alt={track.name} src={imageUrl} />

			<div class="flex flex-col">
				<div>
					{track.name}
				</div>
				<div>
					{track.artists.join(', ')}
				</div>
			</div>

			<div>
				{track.album}
			</div>

			<div class="tabular-nums">
				{formatDuration(track.duration)}
			</div>
		</div>
	{/if}
</div>

<style>
	.track-item {
		display: grid;
		grid-template-columns: auto 1.5fr minmax(200px, 1fr) 74px;
	}
</style>
