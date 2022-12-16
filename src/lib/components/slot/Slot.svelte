<script lang="ts">
	import { onDestroy } from 'svelte'
	import { getSlotContext } from './SlotProvider.svelte'

	export let name = 'default'
	let prevName: string | undefined

	const slots = getSlotContext()

	const removeSlot = ($name: string | undefined) => {
		if ($name) {
			slots.update((slots) => {
				delete slots[$name]
				return slots
			})
		}
	}

	$: {
		removeSlot(prevName)
		prevName = name
	}

	onDestroy(() => {
		removeSlot(name)
	})
</script>

<div class="contents" bind:this={$slots[name]} />
