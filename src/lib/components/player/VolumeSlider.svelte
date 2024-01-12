<script lang="ts">
	import Slider from '../Slider.svelte'

	let volume = $state(1)
</script>

<Slider bind:value={volume} />
