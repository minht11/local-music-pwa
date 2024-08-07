<script lang="ts">
	import PlayPauseIcon from '$lib/components/animated-icons/PlayPauseIcon.svelte'

	import IconButton from '../../IconButton.svelte'

	const player = usePlayer()
</script>

<IconButton disabled={!player.activeTrack} onclick={() => player.togglePlay()}>
	<PlayPauseIcon playing={player.playing} />
</IconButton>
