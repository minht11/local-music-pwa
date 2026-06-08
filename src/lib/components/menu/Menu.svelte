<script lang="ts">
	import { getEasing, timeline } from '$lib/helpers/animations.ts'
	import BaseMenu from './BaseMenu.svelte'
	import { getMeasurementsFromAnchor, positionMenu } from './positioning.ts'
	import type { MenuInternalData, MenuPosition } from './types.ts'

	interface Props {
		data: MenuInternalData
		onclose: () => void
	}

	const { data, onclose }: Props = $props()

	const openAnimation = (menuEl: HTMLDialogElement) => {
		const { options } = data

		if (options?.width) {
			menuEl.style.width = `${options.width}px`
		}
		if (options?.height) {
			menuEl.style.height = `${options.height}px`
		}

		const baseRect = menuEl.getBoundingClientRect()
		const rect = {
			...baseRect,
			width: options?.width ?? baseRect.width,
			height: options?.height ?? baseRect.height,
		}

		const position: MenuPosition = options?.anchor
			? getMeasurementsFromAnchor(rect, data.targetElement, options.preferredAlignment)
			: (options?.position ?? { top: 0, left: 0 })

		positionMenu(menuEl, { ...rect, ...position })

		void timeline([
			[menuEl, { opacity: [0, 1] }, { duration: 45, easing: 'linear' }],
			[
				menuEl,
				{ transform: ['scale(.8)', 'none'] },
				{ duration: 150, easing: getEasing('incoming80'), at: '<' },
			],
		])
	}

	const closeAnimation = (menuEl: HTMLDialogElement) =>
		menuEl.animate({ opacity: [1, 0] }, { duration: 100, easing: 'linear' }).finished

	const onKeydown = (e: KeyboardEvent, close: () => void) => {
		if (e.key === 'Tab') {
			e.preventDefault()
			close()

			return
		}

		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault()
			const focused = (e.currentTarget as HTMLElement).querySelector('button:focus')
			const next =
				e.key === 'ArrowDown' ? focused?.nextElementSibling : focused?.previousElementSibling

			;(next as HTMLButtonElement | null)?.focus()
		}
	}
</script>

<BaseMenu
	items={data.items}
	type="menu"
	textSize="md"
	class="rounded-sm bg-surfaceContainerHigh shadow-2xl backdrop:bg-transparent"
	{openAnimation}
	{closeAnimation}
	{onKeydown}
	{onclose}
/>
