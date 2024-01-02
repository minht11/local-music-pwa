<script lang="ts">
	import Button from '../Button.svelte'
	import PlayPauseIcon from '../animated-icons/PlayPauseIcon.svelte'

	let { playing, onclick } = $props<{ playing?: boolean; onclick?: (e: MouseEvent) => void }>()
</script>

<Button {onclick} class="w-72px !p-0">
	<PlayPauseIcon {playing} />
</Button>
