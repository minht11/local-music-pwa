<script lang="ts">
	import { formatDuration } from '$lib/helpers/utils'
	import { usePlayer } from '$lib/stores/player/store'
	import Slider from '../Slider.svelte'

	const { class: className } = $props<{ class?: string }>()

	const player = usePlayer()

	const max = 1000

	const getValue = () => {
		const value = (player.currentTime / player.duration) * max

		return Number.isFinite(value) ? value : 0
	}

	let seeking = $state(false)
	let seekingValue = $state(0)
	const value = $derived(getValue())

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
	<div class="text-body-sm">
		{formatDuration(seeking ? getTime(seekingValue) : player.currentTime)}
	</div>

	<Slider
		disabled={!player.activeTrack.value}
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

	<div class="text-body-sm">
		{formatDuration(player.duration)}
	</div>
</div>
