<script lang="ts">
	import Slider from '../Slider.svelte'

	const player = usePlayer()
</script>

<Slider bind:value={player.volume} />
