<script context="module" lang="ts">
	const slotProviderKey = Symbol()

	type Slots = Record<PropertyKey, HTMLElement>

	export const getSlotContext = () => getContext<Writable<Slots>>(slotProviderKey)
</script>

<script lang="ts">
	import { setContext, getContext } from 'svelte'
	import { writable, type Writable } from 'svelte/store'

	const store = writable<Slots>({})

	setContext(slotProviderKey, store)
</script>

<slot />
