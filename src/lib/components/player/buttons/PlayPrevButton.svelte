<script lang="ts">
	import IconButton from '../../IconButton.svelte'
	import PlayPreviousNextIcon from '../../animated-icons/PlayPreviousNextIcon.svelte'

	const player = usePlayer()

	const { class: className }: { class?: ClassValue } = $props()
</script>

<IconButton
	tooltip={m.playerPlayPreviousTrack()}
	disabled={player.isQueueEmpty}
	class={className}
	onclick={player.playPrev}
>
	<PlayPreviousNextIcon type="previous" />
</IconButton>
