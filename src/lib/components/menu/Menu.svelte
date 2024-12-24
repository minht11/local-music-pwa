<script lang="ts">
	import { ripple } from '$lib/actions/ripple'
	import '@a11y/focus-trap'
	import type { FocusTrap } from '@a11y/focus-trap'
	import { untrack } from 'svelte'
	import invariant from 'tiny-invariant'
	import Icon from '../icon/Icon.svelte'
	import type { MenuItem } from './types.ts'

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

<div onclick={close} aria-hidden="true" class="pointer-events-auto absolute inset-0"></div>
<focus-trap
	bind:this={menuEl}
	role="menu"
	tabindex="-1"
	class="pointer-events-auto absolute flex flex-col overscroll-contain rounded-sm bg-surfaceContainerHigh py-2 shadow-2xl"
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
			class={[
				'interactable relative flex h-10 grow items-center gap-4 px-4 text-body-md',
				item.selected && 'bg-surfaceVariant text-primary',
			]}
			use:ripple
			onclick={() => {
				item.action()
				close()
			}}
		>
			{#if item.icon}
				<Icon type={item.icon} class="mr-4" />
			{/if}

			{item.label}
		</button>
	{/each}
</focus-trap>
