<script lang="ts">
	import { clamp } from '$lib/helpers/utils/clamp.ts'

	interface Props {
		min?: number
		max?: number
		step?: number
		value: number
		disabled?: boolean
		vertical?: boolean
		onSeekStart?: () => void
		onSeekEnd?: () => void
	}

	let {
		min = 0,
		max = 100,
		step,
		value = $bindable(0),
		disabled,
		vertical = false,
		onSeekStart,
		onSeekEnd,
	}: Props = $props()

	const progressPercentage = $derived.by(() => {
		const percentage = ((value - min) * 100) / (max - min)
		const percentageSafe = Number.isFinite(percentage) ? percentage : 0

		return percentageSafe
	})

	let trackSize = $state(0)

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

	const getTrackRange = (currentTrackSize: number, options: TrackBorderOptions) => {
		const sizePercentage = getPercentageFromValue(
			currentTrackSize,
			options.trackStart,
			options.trackEnd,
		)

		const borderValue = getValueFromPercentage(
			sizePercentage,
			options.roundedStart,
			options.roundedEnd,
		)

		return clamp(Math.round(borderValue), options.roundedStart, options.roundedEnd)
	}

	const getBarBorder = () => {
		const currentTrackSize = getValueFromPercentage(progressPercentage, 0, trackSize)

		const start = getTrackRange(currentTrackSize, {
			trackStart: 0,
			trackEnd: 36,
			roundedStart: 2,
			roundedEnd: 8,
		})

		const end = getTrackRange(currentTrackSize, {
			trackStart: trackSize,
			trackEnd: trackSize - 36,
			roundedStart: 2,
			roundedEnd: 8,
		})

		if (vertical) {
			return `border-radius: ${end}px ${end}px ${start}px ${start}px;`
		}

		return `border-radius: ${start}px ${end}px ${end}px ${start}px;`
	}

	const getTransform = (calc = '') => {
		if (vertical) {
			return `transform: translateY(calc(-${progressPercentage}% ${calc}));`
		}

		return `transform: translateX(calc(${progressPercentage}% ${calc}));`
	}
</script>

<div
	class={['slider relative flex select-none', vertical ? 'h-full' : 'w-full']}
	bind:clientWidth={
		null,
		(width: number) => {
			if (!vertical) {
				trackSize = width
			}
		}
	}
	bind:clientHeight={
		null,
		(height: number) => {
			if (vertical) {
				trackSize = height
			}
		}
	}
>
	<input
		type="range"
		bind:value
		{disabled}
		{min}
		{max}
		{step}
		class={[
			'grow appearance-none opacity-0 disabled:cursor-auto',
			vertical ? 'vertical-input h-full w-11' : 'horizontal-input h-11 w-full',
		]}
		style={vertical ? 'writing-mode: vertical-lr; direction: rtl;' : ''}
		onpointerdown={() => {
			onSeekStart?.()
		}}
		onpointerup={() => {
			onSeekEnd?.()
		}}
		ontouchstart={() => {
			onSeekStart?.()
		}}
		ontouchend={() => {
			onSeekEnd?.()
		}}
	/>

	<div
		class={[
			'pointer-events-none absolute',
			vertical
				? 'bottom-0 left-0 mt-2 flex h-(--slider-size) w-full flex-col justify-end'
				: 'top-0 left-0 mr-2 h-full w-(--slider-size)',
		]}
		style={getTransform()}
	>
		<div
			class={[
				'thumb rounded-lg transition-transform',
				vertical ? 'h-1 w-full' : 'h-full w-1',
				disabled ? 'bg-onSurface/38' : 'bg-primary',
			]}
		></div>
	</div>

	<div
		class={[
			'pointer-events-none absolute inset-0 self-end overflow-clip transition-[border-radius] duration-50 contain-strict',
			vertical ? 'mx-auto h-(--slider-size) w-4' : 'my-auto h-4 w-(--slider-size)',
		]}
		style={getBarBorder()}
	>
		<div
			class={[
				'absolute',
				vertical
					? 'rounded-t-0.5 inset-x-0 -bottom-full mx-auto h-full w-4'
					: 'rounded-r-0.5 inset-y-0 -left-full my-auto h-4 w-full',
				disabled ? 'bg-onSurface/38' : 'bg-primary',
			]}
			style={getTransform(vertical ? '+ 6px' : '- 6px')}
		></div>

		<div
			class={[
				'absolute size-full',
				vertical ? 'rounded-b-0.5 bottom-0 left-0' : 'rounded-l-0.5 top-0 left-0',
				disabled ? 'bg-onSurface/12' : 'bg-primary/30',
			]}
			style={getTransform(vertical ? '- 10px' : '+ 10px')}
		></div>
	</div>
</div>

<style lang="postcss">
	@reference '../../app.css';

	.slider {
		--slider-size: calc(100% - --spacing(1));
	}

	.horizontal-input:is(:active, :focus-visible) ~ div > .thumb {
		transform: scaleX(0.5);
	}
	.vertical-input:is(:active, :focus-visible) ~ div > .thumb {
		transform: scaleY(0.5);
	}

	input::-webkit-slider-thumb {
		-webkit-appearance: none;
		cursor: pointer;
		background-color: red;
	}

	.horizontal-input::-webkit-slider-thumb {
		height: --spacing(11);
		width: --spacing(4);
	}

	.vertical-input::-webkit-slider-thumb {
		height: --spacing(4);
		width: --spacing(11);
	}

	input::-moz-range-thumb {
		cursor: pointer;
	}
</style>
