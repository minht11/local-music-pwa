<script lang="ts">
	import { usePlayer } from '$lib/stores/player/store'
	import type { Snippet } from 'svelte'
	import Artwork from '../Artwork.svelte'

	const { ...props } = $props<{
		class?: string
		children?: Snippet
	}>()

	const player = usePlayer()
</script>

<Artwork src={player.artworkSrc} alt={player.activeTrack?.name} {...props} />
