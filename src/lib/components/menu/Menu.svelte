<script lang="ts">
	import '@a11y/focus-trap'
	import { type FocusTrap } from '@a11y/focus-trap'
	import invariant from 'tiny-invariant'
	import { ripple } from '$lib/actions/ripple'
	import Icon from '../icon/Icon.svelte'
	import type { MenuItem } from './types.ts'
	import { untrack } from 'svelte'

	type Handler = (el: FocusTrap) => void

	interface Props {
		items: readonly MenuItem[]
		onopen: Handler
		onclose: Handler
	}

	const { items, onopen, onclose }: Props = $props()

	let menuEl = $state<FocusTrap>()

	const passHandler = (handler: Handler) => {
		invariant(menuEl, 'menu container is undefined')

		handler(menuEl)
	}

	const close = () => passHandler(onclose)

	$effect(() => {
		untrack(() => passHandler(onopen))
	})
</script>

<svelte:window
	onscroll={close}
	onkeydown={(e) => {
		if (e.key === 'Escape') {
			close()
		}
	}}
/>

<div class="absolute inset-0 pointer-events-auto" />
<focus-trap
	bind:this={menuEl}
	role="menu"
	tabindex="-1"
	class="pointer-events-auto flex flex-col absolute bg-surface rounded-4px py-8px tonal-elevation-4 overscroll-contain shadow-2xl"
	onkeydown={(e: KeyboardEvent) => {
		if (e.key === 'ArrowDown') {
			e.preventDefault()
			menuEl?.focusFirstElement()
			// TODO.
		}
		if (e.key === 'Tab') {
			e.preventDefault()
			close()
		}
	}}
>
	{#each items as item}
		<button
			role="menuitem"
			tabindex="0"
			class={clx(
				'flex items-center grow h-40px gap-16px px-16px text-body-md relative interactable',
				item.selected && 'bg-surfaceVariant text-primary',
			)}
			use:ripple
			onclick={() => {
				item.action()
				close()
			}}
		>
			{#if item.icon}
				<Icon type={item.icon} class="mr-16px" />
			{/if}

			{item.label}
		</button>
	{/each}
</focus-trap>
