<script lang="ts">
	import Icon from '$lib/components/icon/Icon.svelte'
	import IconButton from '../../IconButton.svelte'

	const { class: className }: { class?: string } = $props()

	const player = usePlayer()
</script>

<IconButton
	tooltip={player.shuffle ? m.playerDisableShuffle() : m.playerEnableShuffle()}
	class={className}
	onclick={player.toggleShuffle}
>
	<Icon type="shuffle" />

	<div
		class={clx(
			'transition-1000 transform-origin-center absolute bottom-1 size-1 rounded-full bg-primary transition-transform',
			player.shuffle ? 'scale-100' : 'scale-0',
		)}
	></div>
</IconButton>
