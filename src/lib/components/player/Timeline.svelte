<script lang="ts">
	import { formatDuration } from '$lib/helpers/utils/format-duration.ts'

	import Slider from '../Slider.svelte'

	const { class: className }: { class?: ClassNameValue } = $props()

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

	let timeline = {
		get value() {
			return seeking ? seekingValue : value
		},
		set value(val) {
			if (seeking) {
				seekingValue = val
			} else {
				playerSeek(val)
			}
		},
	}

	const currentTime = () => formatDuration(seeking ? getTime(seekingValue) : player.currentTime)
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
		bind:value={timeline.value}
		onSeekStart={() => {
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
