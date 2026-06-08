<script lang="ts" module>
	import { createContext } from 'svelte'
	import { isElementTextInput } from '$lib/helpers/input.ts'
	import { assign } from '$lib/helpers/utils/assign.ts'
	import BottomSheet from './BottomSheet.svelte'
	import Menu from './Menu.svelte'
	import type { MenuInternalData, MenuItem, MenuOptions } from './types.ts'

	export interface MenuInternalState {
		value?: MenuInternalData
	}

	const [getMenuContext, setMenuContext] = createContext<MenuInternalState>()

	export const setupGlobalMenu = (): void => {
		const menuState = $state<MenuInternalState>({
			value: undefined,
		})

		setMenuContext(menuState)
	}

	export interface MenuAPI {
		showFromEvent: (e: MouseEvent, items: MenuItem[], options: MenuOptions) => void
	}

	const mobileMenuBreakpoint = 640

	const shouldUseBottomSheet = (e: MouseEvent) => {
		if (e instanceof PointerEvent && (e.pointerType === 'touch' || e.pointerType === 'pen')) {
			return window.matchMedia(`(max-width: ${mobileMenuBreakpoint}px)`).matches
		}

		return false
	}

	export const useMenu = (): MenuAPI => {
		const state = getMenuContext()

		invariant(state, 'useMenu must be used within a MenuProvider')

		const showFromEvent: MenuAPI['showFromEvent'] = (e, items, options) => {
			const { target } = e

			invariant(target instanceof HTMLElement, 'target is not an HTMLElement')

			assign(state, {
				value: {
					items,
					targetElement: target,
					options,
					bottomSheet: options.bottomSheet ?? shouldUseBottomSheet(e),
				},
			})
		}

		return {
			showFromEvent,
		}
	}
</script>

<script lang="ts">
	const context = getMenuContext()
	const data = $derived(context.value)

	const handleClose = () => {
		const target = data?.targetElement
		context.value = undefined

		setTimeout(() => {
			// Return focus to the target element
			target?.focus({ preventScroll: true })
		}, 0)
	}

	const globalContextMenuHandler = (e: MouseEvent) => {
		const el = e.composedPath().at(0)
		// Allow standard browser context menu on text inputs — copy/paste with
		// working text selection is hard to replicate in a custom menu.
		if (isElementTextInput(el)) {
			return
		}
		e.preventDefault()
	}
</script>

<svelte:window oncontextmenu={globalContextMenuHandler} />

{#if data}
	{#if data.bottomSheet}
		<BottomSheet items={data.items} onclose={handleClose} />
	{:else}
		<Menu {data} onclose={handleClose} />
	{/if}
{/if}
