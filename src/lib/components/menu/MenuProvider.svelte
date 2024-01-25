<script lang="ts" context="module">
	import invariant from 'tiny-invariant'
	import type { MenuItem, MenuOptions, MenuPosition } from './types'
	import { provideMenu, key, type MenuContext } from './provider.svelte.ts'
	import { assign } from '$lib/helpers/utils'
	import { getContext } from 'svelte'
	import { getMeasurementsFromAnchor } from './get-menu-position-from-anchor.ts'
	import { positionMenu } from './position-menu.ts'
	import { animate, timeline } from 'motion'

	export { provideMenu }

	const getMenuContext = () => {
		const state = getContext<MenuContext>(key)

		invariant(state, 'useMenu must be used within a MenuProvider')

		return state
	}

	export const useMenu = () => {
		const state = getMenuContext()

		invariant(state, 'useMenu must be used within a MenuProvider')

		const showMenu = (items: MenuItem[], targetElement: Element, options: MenuOptions) => {
			console.log('show menu', items, targetElement, document.activeElement)

			assign(state, {
				open: true,
				items,
				targetElement,
				options,
			})
		}

		return {
			show: showMenu,
		}
	}
</script>

<script lang="ts">
	const context = getMenuContext()

	const closeMenu = () => {
		assign(context, {
			open: false,
			items: [],
			targetElement: undefined,
			options: undefined,
		})
	}

	let menuEl = $state<HTMLElement>()

	const openMenu = () => {
		invariant(menuEl, 'menuEl is undefined')
		const { options } = context

		const baseRect = menuEl.getBoundingClientRect()
		const rect = {
			...baseRect,
			width: options?.width ?? baseRect.width,
			height: options?.height ?? baseRect.height,
		}

		let position: MenuPosition
		if (options?.anchor) {
			position = getMeasurementsFromAnchor(rect, context.targetElement, options.preferredAlignment)
		} else {
			position = options?.position ?? {
				top: 0,
				left: 0,
			}
		}

		positionMenu(menuEl, {
			...rect,
			...position,
		})

		const ani = timeline([
			[
				menuEl,
				{
					opacity: [0, 1],
				},
				{
					duration: 0.045,
					easing: 'linear',
				},
			],
			[
				menuEl,
				{
					transform: ['scale(.8)', 'none'],
				},
				{
					duration: 0.15,
					// incoming 80
					easing: [0, 0, 0.2, 1],
					at: 0,
				},
			],
		])

		ani.finished.then(() => {
			menuEl?.focus()
		})
	}

	$effect(() => {
		if (context.open === false) {
			return
		}

		if (menuEl) {
			openMenu()
		}
	})

	const globalContextMenuHandler = (e: MouseEvent) => {
		const el = e.composedPath()[0]

		// Allow standard browser context menu on input[type='text'] elements,
		// because creating custom menu for copy & paste
		// with working text selection is hard.
		if (el instanceof HTMLInputElement && el.type === 'text') {
			return
		}

		e.preventDefault()
	}
</script>

<svelte:window onscroll={closeMenu} oncontextmenu={globalContextMenuHandler} />

{#if context.open}
	<div class="absolute inset-0 pointer-events-auto" />
	<focus-trap
		bind:this={menuEl}
		class="pointer-events-auto absolute h-200px bg-surface rounded-4px py-8px tonal-elevation-4 overscroll-contain"
	>
		Hellow I am menu
	</focus-trap>
{/if}
