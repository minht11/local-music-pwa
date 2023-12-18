<script lang="ts">
	import Button from '../Button.svelte'
	import PlayPauseIcon from '../animated-icons/PlayPauseIcon.svelte'

	let { playing, onclick } = $props<{ playing?: boolean, onclick?: (e: MouseEvent) => void }>()
</script>

<Button
	onclick={onclick}
	class="h-56px w-56px p-0 rounded-16px"
>
	<PlayPauseIcon playing={playing} />
</Button>
