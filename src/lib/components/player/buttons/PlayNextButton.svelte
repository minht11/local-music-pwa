<script lang="ts">
	import PlayPreviousNextIcon from '../../animated-icons/PlayPreviousNextIcon.svelte'
	import IconButton from '../../IconButton.svelte'

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
