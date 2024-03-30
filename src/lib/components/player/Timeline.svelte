<script lang="ts">
	import { formatDuration } from '$lib/helpers/utils'

	import Slider from '../Slider.svelte'

	const { class: className }: { class?: string } = $props()

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
</script>

<div class={clx('flex items-center tabular-nums gap-10px w-full', className)}>
	<!-- <div class="text-body-sm">
		{formatDuration(seeking ? getTime(seekingValue) : player.currentTime)}
	</div> -->

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

	<!-- <div class="text-body-sm">
		{formatDuration(player.duration)}
	</div> -->
</div>
