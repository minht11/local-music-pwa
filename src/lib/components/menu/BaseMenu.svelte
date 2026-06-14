<!-- biome-ignore-all lint/a11y/useValidAriaRole: false positives -->
<script lang="ts">
	import { ripple } from '$lib/attachments/ripple.ts'
	import type { MenuItem } from './types.ts'

	type AnimationFn = (dialog: HTMLDialogElement) => unknown

	interface Props {
		items: readonly MenuItem[]
		type: 'menu' | 'listbox'
		textSize: 'md' | 'lg'
		class?: ClassValue
		openAnimation: AnimationFn
		closeAnimation: AnimationFn
		/** Called once the close animation finishes */
		onclose?: () => void
		onKeydown?: (e: KeyboardEvent, close: () => void) => void
		header?: Snippet<[{ close: () => void }]>
	}

	const {
		items,
		type,
		textSize,
		class: className,
		openAnimation,
		closeAnimation,
		onclose,
		onKeydown,
		header,
	}: Props = $props()

	let dialog: HTMLDialogElement | undefined = $state()
	let closing = false

	const close = () => {
		if (closing || !dialog) {
			return
		}
		closing = true

		void Promise.resolve(closeAnimation(dialog)).then(() => onclose?.())
	}

	const moveFocus = (offset: number) => {
		if (!dialog) {
			return
		}

		// Separators sit between item buttons, so focus moves through a button list
		// instead of element siblings.
		const buttons = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button:not([disabled])'))
		const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement)
		buttons[currentIndex + offset]?.focus()
	}

	const keydownHandler = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			// Keep the dialog mounted until the exit animation completes instead
			// of letting the native Escape handler remove it immediately.
			e.preventDefault()
			close()

			return
		}

		if (e.key === 'ArrowDown') {
			e.preventDefault()
			moveFocus(1)
		}

		if (e.key === 'ArrowUp') {
			e.preventDefault()
			moveFocus(-1)
		}

		onKeydown?.(e, close)
	}

	const pointerDownHandler = (e: PointerEvent) => {
		if (e.target === dialog) {
			close()
		}
	}

	$effect(() => {
		untrack(() => {
			invariant(dialog, 'menu dialog is undefined')

			dialog.showModal()
			dialog.querySelector('button')?.focus()
			void openAnimation(dialog)
		})
	})
</script>

<!-- svelte-ignore a11y_no_interactive_element_to_noninteractive_role -->
<dialog
	bind:this={dialog}
	role="application"
	tabindex="-1"
	class={['pointer-events-auto fixed overscroll-contain', className]}
	onpointerdown={pointerDownHandler}
	onkeydown={keydownHandler}
	onclose={close}
>
	{@render header?.({ close })}

	<div role={type} class="flex flex-col py-2">
		{#each items as item}
			{#if 'separator' in item}
				<hr class="my-2 border-onSurfaceVariant/24" />
			{:else}
				<button
					{@attach ripple()}
					role={type === 'menu' ? 'menuitem' : 'option'}
					type="button"
					class={[
						'interactable relative flex grow items-center px-4 py-2 text-left -outline-offset-2 select-none',
						item.selected && 'bg-surfaceVariant text-primary',
						textSize === 'lg' ? 'min-h-12 text-body-lg' : 'min-h-10 text-body-md',
					]}
					onclick={() => {
						item.action()
						close()
					}}
				>
					{item.label}
				</button>
			{/if}
		{/each}
	</div>
</dialog>
