<script module lang="ts">
	import type { AnimationConfig } from 'svelte/animate'
	import { type AnimationSequence, timeline } from '$lib/helpers/animations.ts'
	import Icon, { type IconType } from '../icon/Icon.svelte'

	export interface DialogOpenAccessor<S> {
		get: () => S | null
		close: () => void
	}

	export type DialogOpen<S = unknown> = DialogOpenAccessor<S> | boolean

	export type DialogData<Open extends DialogOpen> =
		Open extends DialogOpenAccessor<infer S> ? S : undefined

	interface DialogBaseProps<Data> {
		title?: string | ((data: Data) => string)
		icon?: IconType
		class?: ClassValue
		header?: Snippet<[{ data: Data; close: () => void }]>
		children?: Snippet<[{ data: Data; close: () => void }]>
	}

	export interface DialogProps<Open extends DialogOpen> extends DialogBaseProps<DialogData<Open>> {
		open: Open
	}
</script>

<script lang="ts" generics="Open extends DialogOpen">
	let {
		open = $bindable(false) as Open,
		title,
		icon,
		class: className,
		header,
		children,
	}: DialogProps<Open> = $props()

	type UnwrapOpen =
		| {
				isOpen: true
				data: DialogData<Open>
		  }
		| {
				isOpen: false
				data: null
		  }

	const state = $derived.by(() => {
		if (typeof open === 'boolean') {
			return {
				isOpen: open,
				data: undefined,
			} as UnwrapOpen
		}

		const data = open.get()

		return {
			isOpen: data !== null,
			data,
		} as UnwrapOpen
	})

	const titleText = $derived.by(() => {
		if (typeof title === 'function') {
			return state.data ? title(state.data) : ''
		}

		return title
	})

	const close = () => {
		if (typeof open === 'object') {
			open.close()
		} else {
			open = false as Open
		}
	}

	const getParts = (dialog: HTMLDialogElement) => {
		const dialogHeader = dialog.querySelector<HTMLElement>('[data-dialog-header]')
		const dialogBody = dialog.querySelector<HTMLElement>('[data-dialog-content]')
		const dialogFooter = dialog.querySelector<HTMLElement>('[data-dialog-footer]')

		return { dialogHeader, dialogBody, dialogFooter }
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
		const { dialogHeader, dialogBody, dialogFooter } = getParts(dialog)

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
			fade(dialogBody),
			fade(dialogFooter),
			dialogFooter &&
				([
					dialogFooter,
					{ transform: ['translateY(-60px)', 'none'] },
					{ duration: 400, at: '<' },
				] satisfies AnimationSequence),
		].filter((x) => x !== null && x !== undefined)

		timeline(frames, {
			defaultOptions: {
				// ease-standard
				easing: 'cubic-bezier(0.2, 0, 0, 1)',
			},
		})
	}

	const animateOut = (dialog: HTMLDialogElement) => {
		const { dialogHeader, dialogBody, dialogFooter } = getParts(dialog)

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
		].filter((x) => x !== null && x !== undefined)

		return timeline(frames, {
			defaultOptions: {
				// ease-standard
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
			duration: 400,
		}
	}
</script>

{#if state.isOpen}
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
		{#if header}
			{@render header({ data: state.data, close })}
		{:else}
			<div
				data-dialog-header
				class={['flex flex-col gap-4 px-6 pt-6', icon && 'items-center justify-center text-center']}
			>
				{#if icon}
					<Icon type={icon} class="text-secondary" />
				{/if}

				{#if titleText}
					<div class="text-headline-sm">{titleText}</div>
				{/if}
			</div>
		{/if}

		<div class="flex shrink flex-col overflow-hidden">
			{@render children?.({
				data: state.data,
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
			--spacing(70),
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
