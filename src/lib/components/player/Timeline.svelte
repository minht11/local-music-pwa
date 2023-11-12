<script lang="ts">
	// import Slider from '../Slider.svelte'

	const startTime = '0:00'
	const endTime = '3:00'

	let min = 0
	let max = 1000

	let value = 0
</script>

<div class="flex gap-10px w-full">
	<div class="text-body-sm">
		{endTime}
	</div>

	<!-- <Slider /> -->

	<!-- <input
		bind:value
		{min}
		{max}
		type="range"
		style={`--current-value: ${value};`}
		class="appearance-none grow bg-transparent"
	/> -->

	<div class="text-body-sm">
		{startTime}
	</div>
</div>

<style lang="postcss">
	input::-webkit-slider-runnable-track {
		background-image: linear-gradient(to right, currentColor var(--current-value), transparent 0%);
		@apply h-4px rounded-2px;
	}

	input::-webkit-slider-thumb {
		@apply h-16px w-16px rounded-full bg-primary appearance-none -mt-4px;
	}
</style>
