<script lang="ts">
	import type { Album } from '$lib/db/entities'

	import { useAlbum } from '$lib/library/tracks.svelte.ts'
	import GridItem from '../GridItem.svelte'

	const {
		albumId,
		style,
		tabindex,
		class: className,
		onclick,
	} = $props<{
		albumId: number
		style?: string
		tabindex?: number
		class?: string
		onclick?: (album: Album) => void
	}>()

	const data = useAlbum(albumId)

	const album = $derived(data.value)
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex a11y-no-noninteractive-element-interactions -->
<GridItem
	{style}
	{tabindex}
	class={className}
	role="listitem"
	artwork={album?.image}
	onclick={() => album && onclick?.(album)}
	onkeydown={(e) => {
		if (e.key === 'Enter') {
			album && onclick?.(album)
		}
	}}
>
	{#if data.loading === true}
		<div>
			<div class="h-8px rounded-2px bg-onSurface/10 mb-8px"></div>
			<div class="h-4px rounded-2px bg-onSurface/10 w-80%"></div>
		</div>
	{:else if data.error}
		Error loading album
	{:else if album}
		<div class="flex flex-col h-72px text-onSurfaceVariant px-8px justify-center text-center">
			<div class="text-onSurface truncate">
				{album.name}
			</div>
			<div class="truncate">
				{album.artists.join(', ')}
			</div>
		</div>
	{/if}
</GridItem>
