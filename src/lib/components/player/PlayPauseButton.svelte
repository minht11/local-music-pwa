<script>
	import Button from '../Button.svelte'
	import PlayPauseIcon from '../animated-icons/PlayPauseIcon.svelte'

	let isPlaying = false
</script>

<Button
	onclick={() => {
		isPlaying = !isPlaying
	}}
>
	<PlayPauseIcon playing={isPlaying} />
</Button>
