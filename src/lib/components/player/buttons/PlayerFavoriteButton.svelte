<script lang="ts">
	import FavoriteButton from '$lib/components/FavoriteButton.svelte'

	const player = usePlayer()

	const track = $derived(player.activeTrack)
</script>

{#if track}
	<FavoriteButton trackId={track.id} favorite={track.favorite} />
{/if}
