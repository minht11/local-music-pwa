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
	class="slider h-44px text-primary flex items-center appearance-none disabled:cursor-auto grow bg-transparent"
	style={`--current-value: ${getPercentage()}%;`}
	onpointerdown={() => onSeekStart?.()}
	onpointerup={() => onSeekEnd?.()}
/>

<style lang="postcss">
	.slider::-webkit-slider-container {
		height: 4px;
		border-radius: 16px;
		background: linear-gradient(
			to right,
			currentColor 0 calc(var(--current-value) - 6px),
			transparent calc(var(--current-value) - 6px) calc(var(--current-value) + 4px + 6px),
			theme('colors.onPrimaryContainer/0.5') calc(var(--current-value) + 4px + 6px) 100%
		);
	}

	.slider::-webkit-slider-thumb {
		background: currentColor;
		height: 24px;
		width: 4px;
		appearance: none;
		border-radius: 2px;
		transition: transform 0.2s ease-out;
		box-shadow: none;
	}

	.slider:active::-webkit-slider-thumb {
		transform: scaleX(1.2);
	}

	.slider:disabled::-webkit-slider-thumb {
		transform: scale(0);
	}
</style>
