<script lang="ts">
	import type { ClassValue } from 'clsx'
	import Icon from '$lib/components/icon/Icon.svelte'
	import IconButton from '../../IconButton.svelte'
	import { usePlayer } from '$lib/stores/player/use-store.ts'

	const { class: className }: { class?: ClassValue } = $props()

	const player = usePlayer()
</script>

<IconButton
	tooltip={player.isLiked ? "Unlike" : "Like"}
	class={className}
	onclick={player.likeTrack}
>
	<Icon type={player.isLiked ? "favorite" : "favoriteOutline"} />
</IconButton>