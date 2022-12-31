<script context="module" lang="ts">
	export interface DialogButton {
		title: string
		onClick?: () => void
	}
</script>

<script lang="ts">
	import { clx } from '$lib/helpers/clx'

	import Button from './Button.svelte'
	import Icon, { type IconType } from './icon/Icon.svelte'

	export let open = false
	export let title: string
	export let icon: IconType | undefined = undefined
	export let buttons: DialogButton[] = []

	let dialog: HTMLDialogElement

	const close = () => {
		dialog?.close()
	}

	$: {
		if (open) {
			dialog?.showModal()
		} else {
			close()
		}
	}
</script>

{#if open}
	<dialog
		bind:this={dialog}
		on:close={() => {
			open = false
		}}
		class={clx(
			'tonal-elevation-4 flex min-w-[280px] max-w-[560px] select-none flex-col rounded-24 bg-surface p-24 text-onSurface',
			$$props.class,
		)}
	>
		<header class={clx('flex flex-col gap-16', icon && 'items-center justify-center text-center')}>
			{#if icon}
				<Icon type={icon} class="text-secondary" />
			{/if}
			<h1 class="text-headline-sm">{title}</h1>
		</header>

		<div class="mt-16 flex-grow text-onSurfaceVariant">
			<slot />
		</div>

		{#if buttons?.length}
			<div class="mt-24 flex justify-end gap-8">
				{#each buttons as button}
					<Button
						kind="flat"
						class="min-w-[60px]"
						on:click={() => {
							button.onClick?.()
							close()
						}}
					>
						{button.title}
					</Button>
				{/each}
			</div>
		{/if}
	</dialog>
{/if}

<style lang="postcss">
	dialog::backdrop {
		background: rgba(0, 0, 0, 0.12);
	}
</style>
