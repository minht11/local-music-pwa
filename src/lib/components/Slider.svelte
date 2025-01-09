<script lang="ts">
	import { clamp } from '$lib/helpers/utils/clamp.ts'

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

<div class="relative flex w-full select-none" bind:clientWidth={trackWidth}>
	<input
		type="range"
		bind:value
		{disabled}
		{min}
		{max}
		class="h-11 w-full grow appearance-none opacity-0 disabled:cursor-auto"
		onpointerdown={() => onSeekStart?.()}
		onpointerup={() => onSeekEnd?.()}
	/>

	<div
		class="pointer-events-none absolute top-0 left-0 mr-2 h-full w-[calc(100%-4px)]"
		style={getTransform()}
	>
		<div class="thumb h-full w-1 rounded-lg bg-primary transition-transform"></div>
	</div>

	<div
		class="pointer-events-none absolute inset-0 my-auto mr-2 h-4 w-[calc(100%-4px)] overflow-clip transition-[border-radius] duration-50 contain-strict"
		style={getBarBorder()}
	>
		<div
			class="rounded-r-0.5 absolute inset-y-0 -left-full my-auto h-4 w-full bg-primary"
			style={getTransform('- 6px')}
		></div>

		<div
			class="rounded-l-0.5 pointer-events-none absolute top-0 left-0 h-full w-full bg-primary/30"
			style={getTransform('+ 10px')}
		></div>
	</div>
</div>

<style>
	@reference '../../app.css';

	input:active ~ div > .thumb {
		transform: scaleX(0.5);
	}

	input::-webkit-slider-thumb {
		height: --spacing(11);
		cursor: pointer;
	}
</style>
