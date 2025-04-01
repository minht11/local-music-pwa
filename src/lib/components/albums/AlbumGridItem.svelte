<script lang="ts">
	import type { Album } from '$lib/db/database-types'
	import { createAlbumQuery } from '$lib/db/entity'

	import GridItem from '../GridItem.svelte'

	interface Props {
		albumId: number
		style?: string
		tabindex?: number
		class?: ClassValue
		onclick?: (album: Album) => void
	}

	const { albumId, style, tabindex, class: className, onclick }: Props = $props()

	const data = createAlbumQuery(albumId)

	const album = $derived(data.value)
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
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
	{#if data.loading}
		<div>
			<div class="mb-2 h-2 rounded-xs bg-onSurface/10"></div>
			<div class="h-1 w-1/8 rounded-xs bg-onSurface/10"></div>
		</div>
	{:else if data.error}
		Error loading album
	{:else if album}
		<div class="flex h-18 flex-col justify-center px-2 text-center text-onSurfaceVariant">
			<div class="truncate text-onSurface">
				{album.name}
			</div>
			<div class="truncate">
				{album.artists.join(', ')}
			</div>
		</div>
	{/if}
</GridItem>
