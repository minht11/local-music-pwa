<script module lang="ts">
	import Dialog, { type DialogData, type DialogOpen, type DialogProps } from './Dialog.svelte'
	import DialogFooter, { type DialogButton } from './DialogFooter.svelte'

	export interface CommonDialogProps<Open extends DialogOpen> extends DialogProps<Open> {
		buttons?: DialogButton[] | ((data: DialogData<Open>) => DialogButton[])
		onsubmit?: (e: SubmitEvent, data: DialogData<Open>) => void
	}
</script>

<script lang="ts" generics="Open extends DialogOpen">
	let {
		open = $bindable(false) as Open,
		buttons,
		onsubmit,
		children: externalChildren,
		class: className,
		...props
	}: CommonDialogProps<Open> = $props()

	const getButtonItems = (data: DialogData<Open>) => {
		if (typeof buttons === 'function') {
			return buttons(data)
		}

		return buttons
	}
</script>

<Dialog bind:open class={className} {...props}>
	{#snippet children({ data, close })}
		<form
			data-dialog-body
			method="dialog"
			class="contents"
			onsubmit={(e) => {
				e.preventDefault()

				onsubmit?.(e, data)
			}}
		>
			{#if externalChildren}
				<div data-dialog-content class="mt-4 grow px-6 text-onSurfaceVariant">
					{@render externalChildren({ data, close })}
				</div>
			{/if}

			<DialogFooter buttons={getButtonItems(data)} onclose={close} />
		</form>
	{/snippet}
</Dialog>
