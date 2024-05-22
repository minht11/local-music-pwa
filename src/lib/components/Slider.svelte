<script lang="ts">
	import { clamp } from '$lib/helpers/utils'

	interface Props {
		min?: number
		max?: number
		value: number
		disabled?: boolean
		onSeekStart?: () => void
		onSeekEnd?: () => void
	}

	let {
		min = 0,
		max = 100,
		value = $bindable(0),
		disabled,
		onSeekStart,
		onSeekEnd,
	}: Props = $props()

	const progressPercentage = $derived.by(() => {
		const percentage = ((value || 1) * 100) / max
		const percentageSafe = Number.isFinite(percentage) ? percentage : 0

		return percentageSafe
	})

	let trackWidth = $state(0)

	const getValueFromPercentage = (percentage: number, rangeMin: number, rangeMax: number) => {
		const value = (percentage / 100) * (rangeMax - rangeMin) + rangeMin

		return value
	}

	interface TrackBorderOptions {
		trackStart: number
		trackEnd: number
		roundedStart: number
		roundedEnd: number
	}

	const getPercentageFromValue = (value: number, rangeMin: number, rangeMax: number) =>
		((value - rangeMin) / (rangeMax - rangeMin)) * 100

	const getTrackRange = (currentTrackWidth: number, options: TrackBorderOptions) => {
		const widthPercentage = getPercentageFromValue(
			currentTrackWidth,
			options.trackStart,
			options.trackEnd,
		)

		const borderValue = getValueFromPercentage(
			widthPercentage,
			options.roundedStart,
			options.roundedEnd,
		)

		return clamp(Math.round(borderValue), options.roundedStart, options.roundedEnd)
	}

	const getBarBorder = () => {
		const currentTrackWidth = getValueFromPercentage(progressPercentage, 0, trackWidth)

		let start = getTrackRange(currentTrackWidth, {
			trackStart: 0,
			trackEnd: 36,
			roundedStart: 2,
			roundedEnd: 8,
		})

		const end = getTrackRange(currentTrackWidth, {
			trackStart: trackWidth,
			trackEnd: trackWidth - 36,
			roundedStart: 2,
			roundedEnd: 8,
		})
		return `border-radius: ${start}px ${end}px ${end}px ${start}px;`
	}

	const getTransform = (calc = '') => `transform: translateX(calc(${progressPercentage}% ${calc}));`
</script>

<div class="flex w-full relative select-none" bind:clientWidth={trackWidth}>
	<input
		type="range"
		bind:value
		{disabled}
		{min}
		{max}
		class="h-44px opacity-0 appearance-none disabled:cursor-auto grow w-full"
		onpointerdown={() => onSeekStart?.()}
		onpointerup={() => onSeekEnd?.()}
	/>

	<div
		class="absolute h-full left-0 top-0 w-[calc(100%-4px)] pointer-events-none mr-8px"
		style={getTransform()}
	>
		<div class="thumb h-full w-4px transition-transform bg-primary rounded-8px"></div>
	</div>

	<div
		class="w-[calc(100%-4px)] contain-strict overflow-clip absolute h-16px my-auto inset-0 pointer-events-none transition-border-radius duration-100ms mr-8px"
		style={getBarBorder()}
	>
		<div
			class="absolute -left-full rounded-r-2px inset-y-0 w-full h-16px my-auto bg-primary"
			style={getTransform('- 6px')}
		></div>

		<div
			class="absolute left-0 top-0 rounded-l-2px w-full bg-primary/30 h-full pointer-events-none"
			style={getTransform('+ 10px')}
		></div>
	</div>
</div>

<style>
	input:active ~ div > .thumb {
		transform: scaleX(0.5);
	}

	input::-webkit-slider-thumb {
		height: 44px;
		cursor: pointer;
	}
</style>
