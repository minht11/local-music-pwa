<script lang="ts">
	let {
		min = 0,
		max = 100,
		value,
	} = $props<{
		min?: number
		max?: number
		value?: number
	}>()

	const getPercentage = () => {
		const percentage = ((value || 1) * 100) / max
		const percentageSafe = Number.isFinite(percentage) ? percentage : 0

		return percentageSafe
	}
</script>

<input
	type="range"
	bind:value
	{min}
	{max}
	class="slider appearance-none cursor-pointer grow bg-transparent"
	style={`--current-value: ${getPercentage()}%;`}
/>

<style lang="postcss">
	.slider::-webkit-slider-container {
		height: 4px;
		border-radius: 4px;
		background: linear-gradient(
			to right,
			currentColor var(--current-value),
			theme('colors.outline') 0%
		);
	}

	.slider::-webkit-slider-thumb {
		background: currentColor;
		height: 16px;
		width: 16px;
		appearance: none;
		border-radius: 100%;
	}
</style>
