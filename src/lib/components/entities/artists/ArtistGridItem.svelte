<script lang="ts">
	import { type ArtistData, useArtistData } from '$lib/db/query.ts'

	import GridItem from '../../GridItem.svelte'

	interface Props {
		artistId: number
		style?: string
		tabindex?: number
		class?: string
		onclick?: (artist: ArtistData) => void
	}

	const { artistId, style, tabindex, class: className, onclick }: Props = $props()

	const data = useArtistData(artistId)

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
	{#if data.loading === true}
		<div>
			<div class="h-8px rounded-2px bg-onSurface/10 mb-8px"></div>
			<div class="h-4px rounded-2px bg-onSurface/10 w-80%"></div>
		</div>
	{:else if data.error}
		Error loading artist
	{:else if artist}
		<div class="flex flex-col h-72px text-onSurfaceVariant px-8px justify-center text-center">
			<div class="text-onSurface truncate">
				{artist.name}
			</div>
		</div>
	{/if}
</GridItem>
