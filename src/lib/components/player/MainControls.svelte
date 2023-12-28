<script lang="ts">
	import { usePlayer } from '$lib/stores/player/store.ts'
	import IconButton from '../IconButton.svelte'
	import PlayPreviousNextIcon from '../animated-icons/PlayPreviousNextIcon.svelte'
	import PlayPauseButton from './PlayPauseButton.svelte'

	const player = usePlayer()
</script>

<div class="flex gap-8px items-center">
	<IconButton onclick={player.playPrev}>
		<PlayPreviousNextIcon type="previous" />
	</IconButton>

	<PlayPauseButton playing={player.playing} onclick={() => player.togglePlay()} />

	<IconButton onclick={player.playNext}>
		<PlayPreviousNextIcon type="next" />
	</IconButton>
</div>
