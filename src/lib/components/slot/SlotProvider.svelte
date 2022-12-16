<script context="module" lang="ts">
	import { setContext, getContext } from 'svelte'
	import { writable, type Writable } from 'svelte/store'

	const slotProviderKey = Symbol()

	type Slots = Record<PropertyKey, HTMLElement>

	export const createSlotProvider = () => {
		const store = writable<Slots>({})

		setContext(slotProviderKey, store)
	}

	export const getSlotContext = () => getContext<Writable<Slots>>(slotProviderKey)
</script>

<script lang="ts">
	createSlotProvider()
</script>

<slot />
