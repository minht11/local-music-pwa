<script lang="ts">
	import { usePlayer } from '$lib/stores/player/store'
	import Button from '../../Button.svelte'
	import PlayPauseIcon from '../../animated-icons/PlayPauseIcon.svelte'

	const player = usePlayer()
</script>

<Button class="w-72px !p-0" onclick={() => player.togglePlay()}>
	<PlayPauseIcon playing={player.playing} />
</Button>
