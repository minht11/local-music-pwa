<script lang="ts">
	import Slider from '../Slider.svelte'

	const startTime = '0:00'
	const endTime = '3:00'

	let min = 0
	let max = 1000

	let value = 0
</script>

<div class="flex items-center tabular-nums gap-10px w-full">
	<div class="text-body-sm">
		{endTime}
	</div>

	<Slider {min} {max} bind:value={value} />

	<div class="text-body-sm">
		{startTime}
	</div>
</div>
