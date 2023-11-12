<script context="module" lang="ts">
	export interface DialogButton {
		title: string
		onClick?: () => void
	}
</script>

<script lang="ts">
	import { timeline } from 'motion'
	import type { TimelineSegment } from '@motionone/dom/types/timeline/types'
	import { clx } from '$lib/helpers/clx'
	import Button from './Button.svelte'
	import Icon, { type IconType } from './icon/Icon.svelte'

	export let open = false
	export let title: string
	export let icon: IconType | undefined = undefined
	export let buttons: DialogButton[] = []

	let dialog: HTMLDialogElement
	let dialogHeader: HTMLElement
	let dialogBody: HTMLDivElement
	let dialogFooter: HTMLDivElement

	const close = () => {
		dialog?.close()
	}

	const openD = () => {
		if (!dialog) {
			return
		}

		dialog.showModal()

		const fade = (el: HTMLElement) =>
			[el, { opacity: [0, 1] }, { duration: 0.3, at: '<' }] satisfies TimelineSegment

		dialog.animate(
			{
				opacity: [0, 1],
			},
			{
				pseudoElement: '::backdrop',
				duration: 300,
				easing: 'linear',
			},
		)

		timeline(
			[
				[
					dialog,
					{
						y: [-20, 0],
						clipPath: ['inset(0% 0% 100% 0% round 24px)', 'inset(0% 0% 0% 0% round 24px)'],
					},
					{
						duration: 0.4,
					},
				],
				fade(dialogHeader),
				fade(dialogBody),
				fade(dialogFooter),
				[dialogFooter, { y: [-60, 0] }, { duration: 0.4, at: 0 }],
			],
			{
				defaultOptions: {
					easing: [0.2, 0, 0, 1],
				},
			},
		)
	}

	$: {
		dialog
		if (open) {
			openD()
		} else {
			close()
		}
	}
</script>

{#if open}
	<dialog
		bind:this={dialog}
		onclose={() => {
			open = false
		}}
		class={clx(
			'tonal-elevation-4 flex min-w-280px max-w-560px select-none flex-col rounded-24px bg-surface p-24px text-onSurface will-change-[clip-path]',
			$$props.class,
		)}
	>
		<header
			bind:this={dialogHeader}
			class={clx('flex flex-col gap-16px', icon && 'items-center justify-center text-center')}
		>
			{#if icon}
				<Icon type={icon} class="text-secondary" />
			{/if}
			<h1 class="text-headline-sm">{title}</h1>
		</header>

		<div
			data-dialog-part="content"
			bind:this={dialogBody}
			class="mt-16px flex-grow text-onSurfaceVariant"
		>
			<slot />
		</div>

		{#if buttons?.length}
			<div bind:this={dialogFooter} class="mt-24px flex justify-end gap-8px">
				{#each buttons as button}
					<Button
						kind="flat"
						class="min-w-60px"
						onclick={() => {
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

<style>
	dialog::backdrop {
		background: rgba(0, 0, 0, 0.22);
	}
</style>
