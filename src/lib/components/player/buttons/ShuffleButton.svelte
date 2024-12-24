<script lang="ts">
	import Icon from '$lib/components/icon/Icon.svelte'
	import IconButton from '../../IconButton.svelte'

	const { class: className }: { class?: ClassNameValue } = $props()

	const player = usePlayer()
</script>

<IconButton
	tooltip={player.shuffle ? m.playerDisableShuffle() : m.playerEnableShuffle()}
	class={className}
	onclick={player.toggleShuffle}
>
	<Icon type="shuffle" />

	<div
		class={[
			'absolute bottom-1 size-1 origin-center rounded-full bg-primary transition-transform duration-1000',
			player.shuffle ? 'scale-100' : 'scale-0',
		]}
	></div>
</IconButton>
