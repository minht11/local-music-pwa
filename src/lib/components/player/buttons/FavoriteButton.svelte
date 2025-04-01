<script lang="ts">
	import IconButton from '$lib/components/IconButton.svelte'
	import { toggleFavoriteTrack } from '$lib/library/playlists'

	const player = usePlayer()

	const track = $derived(player.activeTrack)
</script>

{#if track}
	<IconButton
		icon={track.favorite ? 'favorite' : 'favoriteOutline'}
		tooltip={track.favorite ? m.trackRemoveFromFavorites() : m.trackAddToFavorites()}
		onclick={() => {
			void toggleFavoriteTrack(track.favorite, track.id)
		}}
	/>
{/if}
