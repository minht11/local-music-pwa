<script context="module" lang="ts">
	import { clx } from '$lib/helpers/clx'
	import { type TimelineSegment, timeline } from 'motion'
	import { untrack } from 'svelte'
	import Button from './Button.svelte'
	import Icon, { type IconType } from './icon/Icon.svelte'

	export interface DialogButton {
		title: string
		type?: 'submit' | 'button' | 'reset' | 'close'
		action?: () => void
	}

	export interface DialogProps {
		open?: boolean
		title: string
		icon?: IconType
		buttons?: DialogButton[]
		class?: string
		children: Snippet
		onclose?: () => void
		onsubmit?: (e: SubmitEvent) => void
	}
</script>

<script lang="ts">
	let {
		open = $bindable(false),
		title,
		icon,
		buttons = [],
		class: className,
		children,
		onclose,
		onsubmit,
	}: DialogProps = $props()

	let dialog = $state<HTMLDialogElement>()!
	let dialogHeader = $state<HTMLElement>()!
	let dialogBody = $state<HTMLElement>()!
	let dialogFooter = $state<HTMLElement>()!

	const animateEnter = () => {
		if (!dialog) {
			return
		}

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

	const animateExit = () => {
		if (!dialog) {
			return
		}

		const fade = (el: HTMLElement) =>
			[el, { opacity: [1, 0] }, { duration: 0.3, at: '<' }] satisfies TimelineSegment

		dialog.animate(
			{
				opacity: [1, 0],
			},
			{
				pseudoElement: '::backdrop',
				duration: 300,
				easing: 'linear',
				fill: 'forwards',
			},
		)

		return timeline(
			[
				[
					dialog,
					{
						y: [0, -20],
						clipPath: ['inset(0% 0% 0% 0% round 24px)', 'inset(0% 0% 100% 0% round 24px)'],
					},
					{
						duration: 0.4,
					},
				],
				[dialogFooter, { y: [0, -60] }, { duration: 0.4, at: 0 }],
				fade(dialogFooter),
				fade(dialogBody),
				fade(dialogHeader),
			],
			{
				defaultOptions: {
					easing: [0.2, 0, 0, 1],
				},
				duration: 0.3,
			},
		).finished
	}

	let isBeingRendered = $state(false)

	$effect(() => {
		if (open) {
			untrack(() => {
				isBeingRendered = true
			})
		} else {
			untrack(() => {
				animateExit()?.then(() => {
					isBeingRendered = false
				})
			})
		}
	})

	const onOpenAction = (node: HTMLDialogElement) => {
		node.showModal()
		animateEnter()
	}

	$effect(() => {
		if (isBeingRendered && !open) {
			onclose?.()
		}
	})
</script>

{#if isBeingRendered}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<dialog
		bind:this={dialog}
		use:onOpenAction
		onkeydown={(e) => {
			if (e.key === 'Escape') {
				open = false
				e.preventDefault()
			}
		}}
		onclose={() => {
			// There is no way to prevent dialog close event
			isBeingRendered = false
			open = false
		}}
		class={clx(
			'focus:outline-none flex min-w-280px max-w-[min(100%-16px,var(--dialog-width,560px))] select-none flex-col rounded-24px bg-surfaceContainerHigh p-24px text-onSurface',
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

		<form method="dialog" class="contents" {onsubmit}>
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
							type={button.type !== 'close' ? button.type : 'button'}
							onclick={() => {
								button.action?.()
								if (!button.type || button.type === 'close') {
									open = false
								}
							}}
						>
							{button.title}
						</Button>
					{/each}
				</div>
			{/if}
		</form>
	</dialog>
{/if}

<style>
	dialog::backdrop {
		background: rgba(0, 0, 0, 0.22);
		backdrop-filter: blur(4px);
	}

	/* dialog[open] {
		opacity: 1;
	}

	dialog {
		opacity: 0;
		transition: opacity 2s ease-in-out, overlay 2s ease-out allow-discrete;
	} */
</style>
