<script lang="ts">
	import PlayPreviousNextIcon from '../../animated-icons/PlayPreviousNextIcon.svelte'
	import IconButton from '../../IconButton.svelte'
	import { usePlayer } from '$lib/stores/player/use-store.ts'
	import * as m from '$paraglide/messages.js'
	import type { ClassValue } from 'clsx'

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
