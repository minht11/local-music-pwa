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
			'size-4px rounded-full bg-primary absolute bottom-4px transition-1000 transition-transform transform-origin-center',
			player.shuffle ? 'scale-0' : 'scale-100',
		)}
	></div>
</IconButton>
