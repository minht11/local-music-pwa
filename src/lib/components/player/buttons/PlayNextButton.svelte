<script lang="ts">
	import IconButton from '../../IconButton.svelte'
	import PlayPreviousNextIcon from '../../animated-icons/PlayPreviousNextIcon.svelte'

	const { class: className }: { class?: string } = $props()

	const player = usePlayer()
</script>

<IconButton class={className} onclick={player.playNext}>
	<PlayPreviousNextIcon type="next" />
</IconButton>
