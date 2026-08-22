<script lang="ts">
	import PlayPreviousNextIcon from '../../animated-icons/PlayPreviousNextIcon.svelte'
	import IconButton from '../../IconButton.svelte'

	const player = usePlayer()

	const { class: className }: { class?: ClassValue } = $props()
</script>

<IconButton
	tooltip={m.playerPlayPreviousTrack()}
	disabled={!player.canPlayPrev}
	class={className}
	onclick={player.playPrev}
>
	<PlayPreviousNextIcon type="previous" />
</IconButton>
