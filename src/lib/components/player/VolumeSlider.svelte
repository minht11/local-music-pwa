<script lang="ts">
	import { usePlayer } from '$lib/stores/player/store'
	import Slider from '../Slider.svelte'

	const player = usePlayer()
</script>

<Slider bind:value={player.volume} />
