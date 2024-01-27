<script lang="ts" context="module">
	import '@a11y/focus-trap'
	import { type FocusTrap } from '@a11y/focus-trap'
	import { setContext } from 'svelte'
	import invariant from 'tiny-invariant'
	import type { MenuItem, MenuOptions, MenuPosition } from './types.ts'
	import { assign } from '$lib/helpers/utils.ts'
	import { getContext } from 'svelte'
	import { getMeasurementsFromAnchor } from './positioning.ts'
	import { positionMenu } from './positioning.ts'
	import { animate, timeline } from 'motion'
	import Menu from './Menu.svelte'

	const key = Symbol('menu')

	export interface MenuInternalData {
		items: MenuItem[]
		targetElement: HTMLElement
		options?: MenuOptions
	}

	export interface MenuInternalState {
		value?: MenuInternalData
	}

	export const initGlobalMenu = () => {
		const menuState = $state<MenuInternalState>({
			value: undefined,
		})

		setContext(key, menuState)
	}

	const getMenuContext = () => {
		const state = getContext<MenuInternalState>(key)

		invariant(state, 'useMenu must be used within a MenuProvider')

		return state
	}

	export const useMenu = () => {
		const state = getMenuContext()

		invariant(state, 'useMenu must be used within a MenuProvider')

		const showMenu = (items: MenuItem[], targetElement: HTMLElement, options: MenuOptions) => {
			assign(state, {
				value: {
					items,
					targetElement,
					options,
				},
			})
		}

		const showMenuFromEvent = (e: MouseEvent, items: MenuItem[], options: MenuOptions) => {
			const { target } = e

			invariant(target instanceof HTMLElement, 'target is not an HTMLElement')

			showMenu(items, target, options)
		}

		return {
			show: showMenu,
			showFromEvent: showMenuFromEvent,
		}
	}
</script>

<script lang="ts">
	const context = getMenuContext()
	const data = $derived(context.value)

	let closing = false

	const openMenu = (menuEl: FocusTrap) => {
		closing = false

		invariant(data, 'data is undefined')
		invariant(menuEl, 'menuEl is undefined')

		const { options } = data

		const baseRect = menuEl.getBoundingClientRect()
		const rect = {
			...baseRect,
			width: options?.width ?? baseRect.width,
			height: options?.height ?? baseRect.height,
		}

		let position: MenuPosition
		if (options?.anchor) {
			position = getMeasurementsFromAnchor(rect, data.targetElement, options.preferredAlignment)
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

	const closeMenu = (menuEl: Element) => {
		// If menu is already closed do nothing.
		// This can happen when keydown event occurs first
		// and then focusout fires after.
		if (!data || closing) {
			return
		}

		closing = true

		data.targetElement.focus()

		// Restore focus to the element that opened the menu
		animate(
			menuEl,
			{
				opacity: [1, 0],
			},
			{
				duration: 0.1,
				easing: 'linear',
			},
		).finished.then(() => {
			// Check if menu is still closing.
			if (closing) {
				context.value = undefined
			}
		})
	}

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

<svelte:window oncontextmenu={globalContextMenuHandler} />

{#if data}
	<div class="absolute inset-0 pointer-events-auto" />
	<Menu
		items={data.items}
		onopen={(el) => {
			openMenu(el)
		}}
		onclose={closeMenu}
	/>
{/if}
