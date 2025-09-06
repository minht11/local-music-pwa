<script lang="ts">
	import PlayPauseIcon from '$lib/components/animated-icons/PlayPauseIcon.svelte'
	import IconButton from '../../IconButton.svelte'
	import { usePlayer } from '$lib/stores/player/use-store.ts'
	import * as m from '$paraglide/messages.js'

	const player = usePlayer()
</script>

<IconButton
	tooltip={player.playing ? m.playerPause() : m.playerPlay()}
	disabled={!player.activeTrack}
	onclick={() => player.togglePlay()}
>
	<PlayPauseIcon playing={player.playing} />
</IconButton>
