<script lang="ts">
	import { type ArtistData, createArtistQuery } from '$lib/library/get/value-queries.ts'

	import GridItem from '../../GridItem.svelte'

	interface Props {
		artistId: number
		style?: string
		tabindex?: number
		class?: ClassValue
		onclick?: (artist: ArtistData) => void
	}

	const { artistId, style, tabindex, class: className, onclick }: Props = $props()

	const data = createArtistQuery(artistId)

	const artist = $derived(data.value)
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<GridItem
	{style}
	{tabindex}
	class={className}
	role="listitem"
	onclick={() => artist && onclick?.(artist)}
	onkeydown={(e) => {
		if (e.key === 'Enter') {
			artist && onclick?.(artist)
		}
	}}
>
	{#if data.status === 'loading'}
		<div>
			<div class="mb-2 h-2 rounded-xs bg-onSurface/10"></div>
			<div class="h-1 w-1/8 rounded-xs bg-onSurface/10"></div>
		</div>
	{:else if data.error}
		Error loading artist
	{:else if artist}
		<div class="flex h-18 flex-col justify-center px-2 text-center text-onSurfaceVariant">
			<div class="truncate text-onSurface">
				{artist.name}
			</div>
		</div>
	{/if}
</GridItem>
