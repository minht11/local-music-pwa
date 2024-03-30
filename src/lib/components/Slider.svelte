<script lang="ts">
	interface Props {
		min?: number
		max?: number
		value: number
		disabled?: boolean
		onSeekStart?: () => void
		onSeekEnd?: () => void
	}

	let { min = 0, max = 100, value = $bindable(0), disabled, onSeekStart, onSeekEnd }: Props = $props()

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
	class="slider h-24px text-primary flex items-center appearance-none disabled:cursor-auto grow bg-transparent"
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
			currentColor 0 var(--current-value),
			theme('colors.onPrimaryContainer/0.5') var(--current-value) 100%
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
