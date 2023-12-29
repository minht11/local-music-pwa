<script lang="ts" context="module">
	const cache = new WeakLRUCache<Blob, string>()
</script>

<script lang="ts">
	import { ripple } from '$lib/actions/ripple'
	import type { Track } from '$lib/db/entities'

	import { formatDuration } from '$lib/helpers/utils'
	import { useTrack } from '$lib/library/tracks.svelte.ts'
	import { usePlayer } from '$lib/stores/player/store.ts'
	import { WeakLRUCache } from 'weak-lru-cache'

	const { trackId, style, tabindex, onclick } = $props<{
		trackId: number
		style?: string
		tabindex?: number
		onclick?: (track: Track) => void
	}>()

	const data = useTrack(trackId, {
		allowEmpty: true,
	})

	const createImageUrl = () => {
		const image = data.value?.image

		if (image && cache.has(image)) {
			return cache.getValue(image)
		}

		if (image) {
			const url = URL.createObjectURL(image)
			cache.setValue(image, url)

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

	const player = usePlayer()

	const isActive = () => {
		const activeTrackId = player.activeTrack.value?.id

		return Boolean(activeTrackId && activeTrackId === data.value?.id)
	}

	const active = $derived(isActive())
</script>

<div {style} class="h-72px flex flex-col">
	{#if data.loading === true}
		Loading...
	{:else if data.error}
		'Error loading track'
	{:else}
		{@const track = data.value}
		<!-- svelte-ignore a11y-no-noninteractive-tabindex a11y-no-noninteractive-element-interactions -->
		<div
			class={clx(
				'relative overflow-hidden track-item px-16px items-center grow gap-20px cursor-pointer hover:bg-onSurface/10 rounded-8px',
				active ? 'bg-surfaceVariant text-onSurfaceVariant' : 'color-onSurfaceVariant',
			)}
			{tabindex}
			role="listitem"
			use:ripple
			onclick={() => onclick?.(track)}
			onkeydown={(e) => {
				if (e.key === 'Enter') {
					onclick?.(track)
				}
			}}
		>
			<img
				class={clx('h-40px w-40px rounded-4px', active && 'glow')}
				alt={track.name}
				src={imageUrl}
			/>

			<div class="flex flex-col">
				<div class={clx(active ? 'text-primary' : 'color-onSurface')}>
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

	@keyframes glow {
		0% {
			box-shadow: 0 0 0 1px theme('colors.primary');
		}
		50% {
			box-shadow: 0 0 0 3px theme('colors.secondary');
		}
		100% {
			box-shadow: 0 0 0 1px theme('colors.primary');
		}
	}

	.glow {
		animation: glow 2.4s linear infinite alternate;
	}
</style>
