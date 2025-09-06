<script lang="ts">
	import { formatDuration } from '$lib/helpers/utils/format-duration.ts'
	import { usePlayer } from '$lib/stores/player/use-store.ts'
	import Slider from '../Slider.svelte'
	import type { ClassValue } from 'clsx'

	const { class: className }: { class?: ClassValue } = $props()

	const player = usePlayer()

	const max = 1000

	let seeking = $state(false)
	let seekingValue = $state(0)

	const value = $derived.by(() => {
		const v = (player.currentTime / player.duration) * max

		return Number.isFinite(v) ? v : 0
	})

	const getTime = (percentage: number) => (percentage / max) * player.duration

	const playerSeek = (val: number) => {
		player.seek(getTime(val))
	}

	const currentTime = () => formatDuration(seeking ? getTime(seekingValue) : player.currentTime)

	const getSliderValue = () => (seeking ? seekingValue : value)
	const setSliderValue = (val: number) => {
		if (seeking) {
			seekingValue = val
		} else {
			playerSeek(val)
		}
	}
</script>

<div
	class={[
		'timeline-container grid w-full items-center gap-2.5 text-nowrap tabular-nums',
		className,
	]}
>
	<div class="text-body-sm">
		{currentTime()}
	</div>

	<Slider
		disabled={!player.activeTrack}
		{max}
		bind:value={getSliderValue, setSliderValue}
		onSeekStart={() => {
			if (!seeking) {
				seekingValue = value
			}

			seeking = true
		}}
		onSeekEnd={() => {
			seeking = false

			playerSeek(seekingValue)
		}}
	/>

	<div class="text-right text-body-sm">
		{formatDuration(player.duration)}
	</div>
</div>

<style>
	.timeline-container {
		grid-template-columns: minmax(32px, max-content) 1fr minmax(32px, max-content);
	}
</style>
