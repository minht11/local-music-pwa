<script module lang="ts">
	import Dialog, { type DialogProps } from './Dialog.svelte'
	import DialogFooter, { type DialogButton } from './DialogFooter.svelte'

	export interface DialogOpenAccessor<S> {
		get(): S | null
		close(): void
	}

	export interface CommonDialogProps<S> extends DialogProps<S> {
		buttons?: DialogButton[] | ((data: S) => DialogButton[])
		onsubmit?: (e: SubmitEvent, data: S) => void
	}
</script>

<script lang="ts" generics="S = void">
	let {
		open = $bindable(false),
		buttons,
		onsubmit,
		children: externalChildren,
		class: className,
		...props
	}: CommonDialogProps<S> = $props()

	const getItems = (data: S) => {
		if (typeof buttons === 'function') {
			return buttons(data)
		} else {
			return buttons
		}
	}
</script>

<Dialog bind:open class={className} {...props}>
	{#snippet children({ data, close })}
		<form
			method="dialog"
			class="contents"
			onsubmit={(e) => {
				e.preventDefault()

				onsubmit?.(e, data)
			}}
		>
			{#if externalChildren}
				<div data-dialog-content class="mt-3 grow px-4 text-onSurfaceVariant sm:mt-4 sm:px-6">
					{@render externalChildren({ data, close })}
				</div>
			{/if}

			<DialogFooter buttons={getItems(data)} onclose={close} />
		</form>
	{/snippet}
</Dialog>
