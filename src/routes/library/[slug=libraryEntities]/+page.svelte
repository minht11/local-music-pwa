<script lang="ts">
	import TrackListItem from '$lib/components/TrackListItem.svelte'

	const { data } = $props()
</script>

{#each data.tracks as trackId}
	<TrackListItem {trackId} />
{/each}
