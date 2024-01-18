<script lang="ts">
	import Button from '../../Button.svelte'
	import PlayPauseIcon from '../../animated-icons/PlayPauseIcon.svelte'

	const player = usePlayer()
</script>

<Button class="w-72px !p-0" disabled={!player.activeTrack} onclick={() => player.togglePlay()}>
	<PlayPauseIcon playing={player.playing} />
</Button>
