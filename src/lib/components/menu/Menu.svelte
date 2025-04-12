<script lang="ts">
	import { ripple } from '$lib/actions/ripple'
	import { untrack } from 'svelte'

	import Icon from '../icon/Icon.svelte'
	import type { MenuItem } from './types.ts'

	type Handler = (el: HTMLDialogElement) => void

	interface Props {
		items: readonly MenuItem[]
		onopen: Handler
		onclose: Handler
	}

	const { items, onopen, onclose }: Props = $props()

	let menuEl = $state<HTMLDialogElement>()

	const passHandler = (handler: Handler) => {
		invariant(menuEl, 'menu container is undefined')

		handler(menuEl)
	}

	const close = () => passHandler(onclose)

	$effect(() => {
		untrack(() => {
			passHandler(onopen)
			menuEl?.querySelector('button')?.focus()
		})
	})

	const keydownHandler = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			close()
			// We don't want dialog to exit top level
			// and instead remain until the animation is complete
			// and then remove from the DOM
			e.preventDefault()

			return
		}

		if (e.key === 'ArrowDown') {
			e.preventDefault()

			// TODO.
			menuEl?.querySelector('button')?.focus()
		}
		if (e.key === 'Tab') {
			e.preventDefault()
			close()
		}
	}

	const pointerDownHandler = (e: PointerEvent) => {
		if (e.target === menuEl) {
			close()
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_no_interactive_element_to_noninteractive_role -->
<dialog
	bind:this={menuEl}
	role="application"
	tabindex="-1"
	class="pointer-events-auto fixed overscroll-contain rounded-sm bg-surfaceContainerHigh shadow-2xl backdrop:bg-transparent"
	onpointerdown={pointerDownHandler}
	onkeydown={keydownHandler}
	onclose={() => {
		// There is no way to prevent dialog close event
		close()
	}}
>
	<div role="menu" class="flex flex-col py-2">
		{#each items as item}
			<button
				role="menuitem"
				tabindex="0"
				class={[
					'interactable relative flex h-10 grow items-center gap-4 px-4 text-body-md -outline-offset-2',
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
	</div>
</dialog>
