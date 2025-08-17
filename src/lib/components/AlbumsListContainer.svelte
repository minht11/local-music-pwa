<script lang="ts">
	import { formatArtists, formatNameOrUnknown } from '$lib/helpers/utils/text.ts'
	import LibraryGridListContainer from './library-grid/LibraryGridListContainer.svelte'

	interface Props {
		items: number[]
	}

	const { items }: Props = $props()
</script>

<LibraryGridListContainer type="albums" {items}>
	{#snippet item(album)}
		<div class="truncate text-onSurface">
			{formatNameOrUnknown(album.name)}
		</div>
		<div class="truncate">
			{formatArtists(album.artists)}
		</div>
	{/snippet}
</LibraryGridListContainer>
