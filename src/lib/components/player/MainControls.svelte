<script lang="ts">
	import SeekBackButton from './buttons/SeekBackButton.svelte'
	import PlayTogglePillButton from './buttons/PlayTogglePillButton.svelte'
	import RepeatButton from './buttons/RepeatButton.svelte'
	import ShuffleButton from './buttons/ShuffleButton.svelte'
	import { isRajneeshEnabled } from '$lib/rajneesh/index.ts'
	import SpeedControlButton from '$lib/rajneesh/components/player/SpeedControlButton.svelte'
	import BgMusicButton from '$lib/rajneesh/components/player/BgMusicButton.svelte'
	import PlayerBookmarkButton from '$lib/rajneesh/components/player/PlayerBookmarkButton.svelte'

	const { class: className }: { class?: ClassValue } = $props()
</script>

<div class={['flex items-center gap-2', className]}>
	{#if isRajneeshEnabled()}
		<SpeedControlButton />
	{:else}
		<ShuffleButton />
	{/if}

	<SeekBackButton />

	<PlayTogglePillButton />

	<PlayerBookmarkButton />

	{#if isRajneeshEnabled()}
		<BgMusicButton />
	{:else}
		<RepeatButton />
	{/if}
</div>
