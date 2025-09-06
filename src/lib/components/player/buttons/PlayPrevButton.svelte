<script lang="ts">
	import PlayPreviousNextIcon from '../../animated-icons/PlayPreviousNextIcon.svelte'
	import IconButton from '../../IconButton.svelte'
	import { usePlayer } from '$lib/stores/player/use-store.ts'
	import * as m from '$paraglide/messages.js'
	import type { ClassValue } from 'clsx'

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
