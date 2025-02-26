<script lang="ts">
	import IconButton from '../../IconButton.svelte'
	import PlayPreviousNextIcon from '../../animated-icons/PlayPreviousNextIcon.svelte'

	const { class: className }: { class?: ClassValue } = $props()

	const player = usePlayer()
</script>

<IconButton
	tooltip={m.playerPlayNextTrack()}
	disabled={player.isQueueEmpty}
	class={className}
	onclick={player.playNext}
>
	<PlayPreviousNextIcon type="next" />
</IconButton>
