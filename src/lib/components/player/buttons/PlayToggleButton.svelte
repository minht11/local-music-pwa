<script lang="ts">
	import PlayPauseIcon from '$lib/components/animated-icons/PlayPauseIcon.svelte'
	import { usePlayer } from '$lib/stores/player/store'
	import IconButton from '../../IconButton.svelte'

	const player = usePlayer()
</script>

<IconButton onclick={() => player.togglePlay()}>
	<PlayPauseIcon playing={player.playing} />
</IconButton>
