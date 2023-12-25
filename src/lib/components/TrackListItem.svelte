<script lang="ts" context="module">
	const cache = new WeakMap<Blob, string>()
</script>

<script lang="ts">
	import { useTrack } from '$lib/library/tracks.svelte.ts'

	const { trackId, style } = $props<{ trackId: number; style?: string }>()

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

<div {style} class="flex items-center h-72px">
	{#if data.loading === true}
		Loading...
	{:else}
		{@const track = data.track}

		<img class="h-40px w-40px rounded-4px" alt={track.name} src={imageUrl} />

		<div class="flex flex-col">
			<div>
				{track.name}
			</div>
			<div>
				{track.duration}
			</div>
		</div>
	{/if}
</div>
