<script module lang="ts">
	import { clx } from '$lib/helpers/clx'
	import { type TimelineSegment, timeline } from 'motion'
	import type { Snippet } from 'svelte'
	import type { AnimationConfig } from 'svelte/animate'
	import Icon, { type IconType } from '../icon/Icon.svelte'

	export interface DialogOpenAccessor<S> {
		get(): S | null
		close(): void
	}

	export interface DialogProps<S> {
		open?: boolean | DialogOpenAccessor<S>
		title?: string
		icon?: IconType
		class?: string
		children?: Snippet<[{ data: S; close: () => void }]>
	}
</script>

<script lang="ts" generics="S">
	let {
		open = $bindable(false),
		title,
		icon,
		class: className,
		children,
	}: DialogProps<S> = $props()

	const openData = $derived(typeof open === 'object' ? open?.get() : undefined)
	const isOpen = $derived.by(() => {
		if (typeof open === 'object') {
			return openData !== null
		} else {
			return open
		}
	})

	const close = () => {
		if (typeof open === 'object') {
			open.close()
		} else {
			open = false
		}
	}

	let dialogHeader = $state<HTMLElement>()!

	const getParts = () => {
		const dialogBody = dialogHeader.querySelector('[data-dialog-content]') as HTMLElement
		const dialogFooter = dialogHeader.querySelector('[data-dialog-footer]') as HTMLElement

		return { dialogBody, dialogFooter }
	}

	const animateBackdrop = (dialog: HTMLDialogElement, isOut = false) =>
		dialog.animate(
			{
				opacity: isOut ? [1, 0] : [0, 1],
			},
			{
				pseudoElement: '::backdrop',
				duration: 300,
				easing: 'linear',
				fill: isOut ? 'forwards' : undefined,
			},
		)

	const animateIn = (dialog: HTMLDialogElement) => {
		const { dialogBody, dialogFooter } = getParts()

		const fade = (el?: HTMLElement) =>
			el ? ([el, { opacity: [0, 1] }, { duration: 0.3, at: '<' }] satisfies TimelineSegment) : null

		animateBackdrop(dialog)

		const frames = [
			[
				dialog,
				{
					y: [-20, 0],
					clipPath: ['inset(0% 0% 100% 0% round 24px)', 'inset(0% 0% 0% 0% round 24px)'],
				},
				{
					duration: 0.4,
				},
			] satisfies TimelineSegment,
			fade(dialogHeader),
			fade(dialogBody),
			fade(dialogFooter),
			[dialogFooter, { y: [-60, 0] }, { duration: 0.4, at: 0 }] satisfies TimelineSegment,
		].filter((x) => x !== null)

		timeline(frames, {
			defaultOptions: {
				easing: [0.2, 0, 0, 1],
			},
		})
	}

	const animateOut = (dialog: HTMLDialogElement) => {
		const { dialogBody, dialogFooter } = getParts()

		const fade = (el: HTMLElement) =>
			[el, { opacity: [1, 0] }, { duration: 0.3, at: '<' }] satisfies TimelineSegment

		animateBackdrop(dialog, true)

		const frames = [
			[
				dialog,
				{
					y: [0, -20],
					clipPath: ['inset(0% 0% 0% 0% round 24px)', 'inset(0% 0% 100% 0% round 24px)'],
				},
				{
					duration: 0.4,
				},
			] satisfies TimelineSegment,
			[dialogFooter, { y: [0, -60] }, { duration: 0.4, at: 0 }] satisfies TimelineSegment,
			fade(dialogFooter),
			fade(dialogBody),
			fade(dialogHeader),
		].filter((x) => x !== null) as TimelineSegment[]

		return timeline(frames, {
			defaultOptions: {
				easing: [0.2, 0, 0, 1],
			},
			duration: 0.3,
		}).finished
	}

	const onOpenAction = (dialog: HTMLDialogElement) => {
		dialog.showModal()
		void animateIn(dialog)
	}

	const outAni = (dialog: HTMLDialogElement): AnimationConfig => {
		void animateOut(dialog)

		// TODO. A hack until svelte supports non duration based animations
		return {
			duration: 300,
		}
	}

	$effect(() => {
		if (isOpen) {
			window.dispatchEvent(new CustomEvent('dialog-opened'))
		}
	})
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<dialog
		use:onOpenAction
		out:outAni
		onkeydown={(e) => {
			if (e.key === 'Escape') {
				close()
				// We don't want dialog to exit top level
				// and instead remain until the animation is complete
				// and then remove from the DOM
				e.preventDefault()
			}
		}}
		onclose={() => {
			// There is no way to prevent dialog close event
			close()
		}}
		class={clx(
			'focus:outline-none flex select-none flex-col rounded-24px bg-surfaceContainerHigh text-onSurface',
			className,
		)}
	>
		<header
			bind:this={dialogHeader}
			class={clx(
				'flex flex-col gap-16px px-24px pt-24px',
				icon && 'items-center justify-center text-center',
			)}
		>
			{#if icon}
				<Icon type={icon} class="text-secondary" />
			{/if}

			{#if title}
				<h1 class="text-headline-sm">{title}</h1>
			{/if}
		</header>

		<div class="flex flex-col shrink overflow-hidden">
			{@render children?.({
				data: openData!,
				close,
			})}
		</div>
	</dialog>
{/if}

<style>
	dialog {
		/*
			We want to allow user of dialog to specify their preferred height
			but keep it inside window bounds
		*/
		max-width: initial !important;
		max-height: min(100% - 24px - 24px, var(--dialog-height, 100%), 600px) !important;
		width: clamp(280px, var(--dialog-width, 400px), 100% - 16px) !important;
		height: max-content !important;
		overscroll-behavior: contain;
	}

	dialog::backdrop {
		background: rgba(0, 0, 0, 0.22);
		backdrop-filter: blur(4px);
	}
</style>
