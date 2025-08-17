<script lang="ts" module>
	import { getContext, setContext } from 'svelte'
	import { timeline } from '$lib/helpers/animations.ts'
	import { assign } from '$lib/helpers/utils/assign.ts'
	import Menu from './Menu.svelte'
	import { getMeasurementsFromAnchor, positionMenu } from './positioning.ts'
	import type { MenuItem, MenuOptions, MenuPosition } from './types.ts'

	const key = Symbol('menu')

	export interface MenuInternalData {
		items: MenuItem[]
		targetElement: HTMLElement
		options?: MenuOptions
	}

	export interface MenuInternalState {
		value?: MenuInternalData
	}

	export const setupGlobalMenu = (): void => {
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

	export interface MenuAPI {
		show: (items: MenuItem[], targetElement: HTMLElement, options: MenuOptions) => void
		showFromEvent: (e: MouseEvent, items: MenuItem[], options: MenuOptions) => void
	}

	export const useMenu = (): MenuAPI => {
		const state = getMenuContext()

		invariant(state, 'useMenu must be used within a MenuProvider')

		const showMenu: MenuAPI['show'] = (items, targetElement, options) => {
			assign(state, {
				value: {
					items,
					targetElement,
					options,
				},
			})
		}

		const showMenuFromEvent: MenuAPI['showFromEvent'] = (e, items, options) => {
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

	const openMenu = (menuEl: HTMLDialogElement) => {
		closing = false

		invariant(data, 'data is undefined')

		const { options } = data

		menuEl.showModal()
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

		timeline([
			[
				menuEl,
				{
					opacity: [0, 1],
				},
				{
					duration: 45,
					easing: 'linear',
				},
			],
			[
				menuEl,
				{
					transform: ['scale(.8)', 'none'],
				},
				{
					duration: 150,
					// incoming 80
					easing: 'cubic-bezier(0, 0, 0.2, 1)',
					at: '<',
				},
			],
		])
	}

	const closeMenu = (menuEl: Element) => {
		// If menu is already closed do nothing.
		// This can happen when keydown event occurs first
		// and then focusout fires after.
		if (!data || closing) {
			return
		}

		closing = true

		void menuEl
			.animate(
				{
					opacity: [1, 0],
				},
				{
					duration: 100,
					easing: 'linear',
				},
			)
			.finished.then(() => {
				// Check if menu is still closing.
				if (!closing) {
					return
				}

				// Save the element that opened the menu
				const target = data.targetElement
				context.value = undefined

				setTimeout(() => {
					// Restore focus to the element that opened the menu
					target.focus({
						preventScroll: true,
					})
				}, 0)
			})
	}

	const globalContextMenuHandler = (e: MouseEvent) => {
		const el = e.composedPath().at(0)

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
	<Menu items={data.items} onopen={openMenu} onclose={closeMenu} />
{/if}
