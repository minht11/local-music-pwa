<script context="module" lang="ts">
	import { animate, timeline, type TimelineSegment } from 'motion'
	import { clx } from '$lib/helpers/clx'
	import Button from './Button.svelte'
	import Icon, { type IconType } from './icon/Icon.svelte'
	import type { Snippet } from 'svelte'

	export interface DialogButton {
		title: string
		action?: () => void
	}

	export interface DialogProps {
		open?: boolean
		title: string
		icon?: IconType
		buttons?: DialogButton[]
		class?: string
		children: Snippet
	}
</script>

<script lang="ts">
	let {
		open,
		title,
		icon,
		buttons = [],
		class: className,
		children,
	} = $props<DialogProps>()

	let dialog = $state<HTMLDialogElement>()!
	let dialogHeader = $state<HTMLElement>()!
	let dialogBody = $state<HTMLElement>()!
	let dialogFooter = $state<HTMLElement>()!

	const close = () => {
		// Check for browser support
		// if (document.startViewTransition) {
		// 	const transition = document.startViewTransition(() => {
		// 		dialog?.close()
		// 	})

		// 	transition.finished.then(() => {
		// 		ontoggle?.(false)
		// 	})
		// }
		// else {
		// 	ontoggle?.(false)
		// 	dialog?.close()
		// }

		open = false
		// ontoggle?.(false)
		// dialog?.close()
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

	$effect(() => {
		if (open) {
			openD()
		} else {
			close()
		}
	})

// 	const dialogAniTrans = (node: HTMLElement, params: any, options: { direction: 'in' | 'out' | 'both' }) => {
// 	delay?: number,
// 	duration?: number,
// 	easing?: (t: number) => number,
// 	css?: (t: number, u: number) => string,
// 	tick?: (t: number, u: number) => void
// }

	const outAni = async (node: HTMLDialogElement) => {
		console.log(node)

		await animate(node, {
			opacity: [1, 0],
		}, {
			duration: 2,
			easing: 'linear',
		}).finished

		console.log('out')

		return
	}
</script>

{#if open}
	<dialog
		bind:this={dialog}
		out:outAni
		onclose={() => {
			close()
		}}
		class={clx(
			'tonal-elevation-4 flex min-w-280px max-w-560px select-none flex-col rounded-24px bg-surface p-24px text-onSurface will-change-[clip-path]',
			className,
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
			{@render children()}
		</div>

		{#if buttons?.length}
			<div bind:this={dialogFooter} class="mt-24px flex justify-end gap-8px">
				{#each buttons as button}
					<Button
						kind="flat"
						class="min-w-60px"
						onclick={() => {
							button.action?.()
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

	/* dialog[open] {
		opacity: 1;
	}

	dialog {
		opacity: 0;
		transition: opacity 2s ease-in-out, overlay 2s ease-out allow-discrete;
	} */

	dialog {
		view-transition-name: dialog;
	}
</style>
