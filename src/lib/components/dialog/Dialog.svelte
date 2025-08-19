<script module lang="ts">
	import type { AnimationConfig } from 'svelte/animate'
	import { type AnimationSequence, timeline } from '$lib/helpers/animations.ts'
	import Icon, { type IconType } from '../icon/Icon.svelte'

	export interface DialogOpenAccessor<S> {
		get(): S | null
		close(): void
	}

	export interface DialogProps<S> {
		open?: boolean | DialogOpenAccessor<S>
		title?: string
		icon?: IconType
		class?: ClassValue
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
		const dialogBody = dialogHeader.querySelector<HTMLElement>('[data-dialog-content]')
		const dialogFooter = dialogHeader.querySelector<HTMLElement>('[data-dialog-footer]')

		return { dialogBody, dialogFooter }
	}

	const animateBackdrop = (dialog: HTMLDialogElement, isOut = false) => {
		try {
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
		} catch (err) {
			// Firefox does not support pseudo-element animations
			// https://bugzilla.mozilla.org/show_bug.cgi?id=1770591
			if (import.meta.env.DEV) {
				console.warn(err)
			}
		}
	}

	const animateIn = (dialog: HTMLDialogElement) => {
		const { dialogBody, dialogFooter } = getParts()

		const fade = (el: HTMLElement | null): AnimationSequence | null =>
			el ? [el, { opacity: [0, 1] }, { duration: 300, at: '<' }] : null

		animateBackdrop(dialog)

		const frames: readonly AnimationSequence[] = [
			[
				dialog,
				{
					transform: ['translateY(-20px)', 'none'],
					clipPath: ['inset(0% 0% 100% 0% round 24px)', 'inset(0% 0% 0% 0% round 24px)'],
				},
				{
					duration: 400,
				},
			] satisfies AnimationSequence,
			fade(dialogHeader),
			dialogBody && fade(dialogBody),
			dialogFooter && fade(dialogFooter),
			dialogFooter &&
				([
					dialogFooter,
					{ transform: ['translateY(-60px)', 'none'] },
					{ duration: 400, at: '<' },
				] satisfies AnimationSequence),
		].filter((x) => x !== null && x !== undefined)

		timeline(frames, {
			defaultOptions: {
				easing: 'cubic-bezier(0.2, 0, 0, 1)',
			},
		})
	}

	const animateOut = (dialog: HTMLDialogElement) => {
		const { dialogBody, dialogFooter } = getParts()

		const fade = (el: HTMLElement | null): AnimationSequence | null =>
			el ? [el, { opacity: [1, 0] }, { duration: 300, at: '<' }] : null

		animateBackdrop(dialog, true)

		const frames: readonly AnimationSequence[] = [
			[
				dialog,
				{
					transform: ['none', 'translateY(-20px)'],
					clipPath: ['inset(0% 0% 0% 0% round 24px)', 'inset(0% 0% 100% 0% round 24px)'],
				},
				{
					duration: 400,
				},
			] satisfies AnimationSequence,
			dialogFooter &&
				([
					dialogFooter,
					{ transform: ['none', 'translateY(-60px)'] },
					{ duration: 400, at: '<' },
				] satisfies AnimationSequence),
			fade(dialogFooter),
			fade(dialogBody),
			fade(dialogHeader),
		].filter((x) => x !== null)

		return timeline(frames, {
			defaultOptions: {
				easing: 'cubic-bezier(0.2, 0, 0, 1)',
			},
		})
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
</script>

{#if isOpen}
	<dialog
		{@attach onOpenAction}
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
		class={[
			'm-auto flex flex-col rounded-3xl bg-surfaceContainerHigh text-onSurface contain-content select-none focus:outline-none',
			className,
		]}
	>
		<header
			bind:this={dialogHeader}
			class={['flex flex-col gap-4 px-6 pt-6', icon && 'items-center justify-center text-center']}
		>
			{#if icon}
				<Icon type={icon} class="text-secondary" />
			{/if}

			{#if title}
				<h1 class="text-headline-sm">{title}</h1>
			{/if}
		</header>

		<div class="flex shrink flex-col overflow-hidden">
			{@render children?.({
				data: openData!,
				close,
			})}
		</div>
	</dialog>
{/if}

<style lang="postcss">
	@reference '../../../app.css';

	dialog {
		/*
			We want to allow user of dialog to specify their preferred height
			but keep it inside window bounds
		*/
		max-width: initial !important;
		max-height: min(100% - --spacing(6) * 2, var(--dialog-height, 100%), --spacing(150)) !important;
		width: clamp(
			var(--dialog-width, --spacing(70)),
			var(--dialog-width, --spacing(100)),
			100% - --spacing(8)
		) !important;
		height: max-content !important;
		overscroll-behavior: contain;
	}

	dialog::backdrop {
		background: rgba(0, 0, 0, 0.22);
		backdrop-filter: blur(4px);
	}
</style>
