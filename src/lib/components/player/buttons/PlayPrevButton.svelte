<script lang="ts">
	import IconButton from '../../IconButton.svelte'
	import PlayPreviousNextIcon from '../../animated-icons/PlayPreviousNextIcon.svelte'

	const player = usePlayer()

	const { class: className } = $props<{ class?: string }>()
</script>

<IconButton class={className} onclick={player.playPrev}>
	<PlayPreviousNextIcon type="previous" />
</IconButton>
