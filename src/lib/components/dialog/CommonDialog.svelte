<script context="module" lang="ts">
	import Dialog, { type DialogProps } from './Dialog.svelte'
	import DialogFooter, { type DialogButton } from './DialogFooter.svelte'

	export interface DialogOpenAccessor<S> {
		get(): S | null
		close(): void
	}

	export interface CommonDialogProps<S> extends DialogProps<S> {
		buttons?: DialogButton[] | ((data: S) => DialogButton[])
		onsubmit?: (e: SubmitEvent) => void
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

	const submitHandler = (e: SubmitEvent) => {
		e.preventDefault()

		onsubmit?.(e)
	}

	const getItems = (data: S) => {
		if (typeof buttons === 'function') {
			return buttons(data)
		} else {
			return buttons
		}
	}
</script>

<Dialog bind:open class={clx(className)} {...props}>
	{#snippet children({ data, close })}
		<form method="dialog" class="contents" onsubmit={submitHandler}>
			{#if externalChildren}
				<div data-dialog-content class="mt-16px px-24px flex-grow text-onSurfaceVariant">
					{@render externalChildren({ data, close })}
				</div>
			{/if}

			<DialogFooter buttons={getItems(data)} onclose={close} />
		</form>
	{/snippet}
</Dialog>
