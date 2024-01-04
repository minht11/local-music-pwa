<script lang="ts">
	let {
		min = 0,
		max = 100,
		value,
		disabled,
		onSeekStart,
		onSeekEnd,
	} = $props<{
		min?: number
		max?: number
		value: number
		disabled?: boolean
		onSeekStart?: () => void
		onSeekEnd?: () => void
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
	{disabled}
	{min}
	{max}
	class="slider appearance-none cursor-pointer disabled:cursor-auto grow bg-transparent"
	style={`--current-value: ${getPercentage()}%;`}
	onpointerdown={() => onSeekStart?.()}
	onpointerup={() => onSeekEnd?.()}
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
		transition: transform 0.2s ease-out;
	}

	.slider:active::-webkit-slider-thumb {
		transform: scale(1.2);
	}

	.slider:disabled::-webkit-slider-thumb {
		transform: scale(0);
	}
</style>
