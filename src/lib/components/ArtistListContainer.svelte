<script lang="ts">
	import LibraryGridListContainer from '$lib/components/library-grid/LibraryGridListContainer.svelte'
	import { formatNameOrUnknown } from '$lib/helpers/utils/text'

	interface Props {
		items: number[]
	}

	const { items }: Props = $props()
</script>

<LibraryGridListContainer type="artists" {items}>
	{#snippet item(artist)}
		<div class="truncate text-onSurface">
			{formatNameOrUnknown(artist.name)}
		</div>
	{/snippet}
</LibraryGridListContainer>
