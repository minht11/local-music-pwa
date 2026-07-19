<script lang="ts">
	import Icon from '$lib/components/icon/Icon.svelte'
	import IconButton from '../../IconButton.svelte'
	import ActiveIndicator from './ActiveIndicator.svelte'

	const { class: className }: { class?: ClassValue } = $props()

	const player = usePlayer()
</script>

<IconButton
	tooltip={player.queue.shuffle ? m.playerDisableShuffle() : m.playerEnableShuffle()}
	class={className}
	onclick={player.queue.toggleShuffle}
>
	<Icon type="shuffle" />

	<ActiveIndicator active={player.queue.shuffle} />
</IconButton>
