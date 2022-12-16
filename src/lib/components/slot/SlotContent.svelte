<script lang="ts">
	import { portal } from 'svelte-portal'
	import { getSlotContext } from './SlotProvider.svelte'

	const slots = getSlotContext()

	export let name = 'default'

	$: target = $slots[name]
</script>

{#if target}
	<div use:portal={target} class="contents">
		<slot />
	</div>
{/if}
