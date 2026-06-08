<script lang="ts">
	import { animateBackdrop, getEasing } from '$lib/helpers/animations.ts'
	import BaseMenu from './BaseMenu.svelte'
	import type { MenuItem } from './types.ts'

	interface Props {
		items: readonly MenuItem[]
		onclose: () => void
	}

	const { items, onclose }: Props = $props()

	const standardDecelerate = getEasing('standardDecelerate')

	const openAnimation = (sheetEl: HTMLDialogElement) => {
		sheetEl.animate(
			{ transform: ['translateY(100%)', 'translateY(0)'] },
			{ duration: 250, easing: standardDecelerate },
		)
		animateBackdrop(sheetEl, {
			duration: 200,
			easing: standardDecelerate,
		})
	}

	const closeAnimation = (sheetEl: HTMLDialogElement) => {
		// Continue from wherever a drag left the sheet so dismissal feels seamless.
		const fromY = Math.max(0, sheetEl.getBoundingClientRect().bottom - window.innerHeight)
		sheetEl.style.transform = ''

		const sheetHeight = sheetEl.offsetHeight
		const duration = Math.max(100, 200 * (1 - fromY / sheetHeight))
		const easing = getEasing('standardAccelerate')

		animateBackdrop(sheetEl, {
			isOut: true,
			duration,
			easing,
		})

		return sheetEl.animate(
			{ transform: [`translateY(${fromY}px)`, `translateY(${sheetHeight}px)`] },
			{ duration, easing },
		).finished
	}

	let sheetEl: HTMLDialogElement | null = null
	let dragStartY = 0
	let dragCurrentY = 0
	let isDragging = false

	const onDragStart = (e: PointerEvent) => {
		sheetEl = (e.currentTarget as HTMLElement).closest('dialog')
		if (!sheetEl) {
			return
		}

		isDragging = true
		dragStartY = e.clientY
		dragCurrentY = 0
		;(e.target as HTMLElement).setPointerCapture(e.pointerId)
	}

	const onDragMove = (e: PointerEvent) => {
		if (!(isDragging && sheetEl)) {
			return
		}

		dragCurrentY = Math.max(0, e.clientY - dragStartY)
		sheetEl.style.transform = `translateY(${dragCurrentY}px)`
	}

	const onDragEnd = (close: () => void) => {
		if (!(isDragging && sheetEl)) {
			return
		}

		isDragging = false
		const y = dragCurrentY
		dragCurrentY = 0

		if (y > sheetEl.offsetHeight * 0.35) {
			close()

			return
		}

		// Spring back to rest if the drag didn't pass the dismiss threshold.
		sheetEl.style.transform = ''
		sheetEl.animate(
			{ transform: [`translateY(${y}px)`, 'translateY(0)'] },
			{ duration: 200, easing: standardDecelerate },
		)
	}
</script>

<BaseMenu
	{items}
	type="menu"
	textSize="lg"
	class="inset-x-0 top-auto bottom-0 m-0 max-h-[80dvh] w-full max-w-full rounded-t-2xl bg-surfaceContainerHigh pb-[env(safe-area-inset-bottom)] shadow-2xl backdrop:bg-scrim/40"
	{openAnimation}
	{closeAnimation}
	{onclose}
>
	{#snippet header({ close })}
		<div
			class="flex cursor-grab touch-none justify-center pt-3 pb-1 active:cursor-grabbing"
			role="presentation"
			onpointerdown={onDragStart}
			onpointermove={onDragMove}
			onpointerup={() => onDragEnd(close)}
			onpointercancel={() => onDragEnd(close)}
		>
			<div class="h-1 w-10 rounded-full bg-onSurfaceVariant/40"></div>
		</div>
	{/snippet}
</BaseMenu>
