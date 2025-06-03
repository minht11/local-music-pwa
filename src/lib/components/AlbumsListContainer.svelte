<script lang="ts">
	import LibraryGridListContainer from './library-grid/LibraryGridListContainer.svelte'

	interface Props {
		items: number[]
	}

	const { items }: Props = $props()
</script>

<LibraryGridListContainer type="albums" {items}>
	{#snippet item(album)}
		<div class="truncate text-onSurface">
			{album.name}
		</div>
		<div class="truncate">
			{album.artists.join(', ')}
		</div>
	{/snippet}
</LibraryGridListContainer>
