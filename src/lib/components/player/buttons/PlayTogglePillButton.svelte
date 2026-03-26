<script lang="ts">
	import PlayPauseIcon from '../../animated-icons/PlayPauseIcon.svelte'
	import Spinner from '$lib/components/Spinner.svelte'
	import Icon from '$lib/components/icon/Icon.svelte'
	import Button from '../../Button.svelte'

	const player = usePlayer()
	const hasPlaybackError = $derived(!!player.playbackError)
</script>

<Button
	tooltip={hasPlaybackError ? m.reload() : player.playing ? m.playerPause() : m.playerPlay()}
	class="w-18 !p-0"
	disabled={!player.activeTrack}
	onclick={() => (hasPlaybackError ? player.retryPlayback() : player.togglePlay())}
>
	{#if hasPlaybackError}
		<Icon type="cached" class="size-6" />
	{:else if player.loading}
		<Spinner class="size-6" />
	{:else}
		<PlayPauseIcon playing={player.playing} />
	{/if}
</Button>
