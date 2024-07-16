<script context="module" lang="ts">
	import Button, { type ButtonKind } from '../Button.svelte'

	export interface DialogButton<S = void> {
		title: string
		align?: 'left'
		kind?: ButtonKind
		type?: 'submit' | 'button' | 'reset' | 'close'
		action?: (data: S) => void
	}

	export interface DialogButtonProps<S = void> {
		buttons?: DialogButton<S>[]
		state?: S
		onclose: () => void
	}
</script>

<script lang="ts" generics="S">
	let { buttons = [], onclose, state }: DialogButtonProps<S> = $props()
</script>

{#if buttons?.length}
	<div data-dialog-footer class="flex justify-end gap-8px p-24px">
		{#each buttons as button}
			<Button
				kind={button.kind ?? 'flat'}
				class={clx('min-w-60px', button.align === 'left' && 'mr-auto')}
				type={button.type !== 'close' ? button.type : 'button'}
				onclick={() => {
					button.action?.(state as S)
					if (!button.type || button.type === 'close') {
						onclose()
					}
				}}
			>
				{button.title}
			</Button>
		{/each}
	</div>
{/if}
