<script lang="ts">
	import IconButton from '../../IconButton.svelte'
	import PlayPreviousNextIcon from '../../animated-icons/PlayPreviousNextIcon.svelte'

	const { class: className } = $props<{ class?: string }>()

	const player = usePlayer()
</script>

<IconButton class={className} onclick={player.playNext}>
	<PlayPreviousNextIcon type="next" />
</IconButton>
