<script lang="ts" context="module">
	import { nanoid } from 'nanoid'
	import { ripple } from '$lib/actions/ripple'
	import Icon, { type IconType } from './icon/Icon.svelte'
	import { autoUpdate } from '@floating-ui/dom'
	import { assign } from '$lib/helpers/utils'

	export const getMenuId = (id = nanoid(10)) => `menu-${id}`

	export interface MenuItem {
		label: string
		icon?: IconType
		action: () => void
	}
</script>

<script lang="ts">
	const { items, id } = $props<{
		id?: string
		items: MenuItem[]
	}>()

	let popover = $state<HTMLDivElement>()!
	let cleanup: () => void

	const onToggle = (e: ToggleEvent) => {
		const isOpen = e.newState === 'open'

		if (!isOpen) {
			cleanup?.()

			return
		}

		const target = document.querySelector<HTMLButtonElement>(`[popovertarget=${id}]`)

		if (!target) {
			cleanup?.()

			return
		}

		cleanup = autoUpdate(target, popover, () => {
			const rect = target.getBoundingClientRect()

			assign(popover.style, {
				width: `${rect.width}px`,
				left: `${rect.left}px`,
				top: `${rect.top + rect.height}px`,
			})
		})
	}
</script>

<div
	{id}
	bind:this={popover}
	popover
	role="menu"
	class="flex-col contain-content inset-auto m-0 px-0 rounded-4px py-8px tonal-elevation-3 overscroll-contain"
	ontoggle={(e) => {
		onToggle(e as unknown as ToggleEvent)
	}}
>
	{#each items as item}
		<button
			role="menuitem"
			class="flex items-center grow h-40px gap-16px px-16px text-body-md relative interactable"
			use:ripple
			onclick={() => {
				item.action()
				popover.hidePopover()
			}}
		>
			{#if item.icon}
				<Icon type={item.icon} class="mr-16px" />
			{/if}

			{item.label}
		</button>
	{/each}
</div>

<style>
	[popover]:popover-open {
		display: flex;
	}
</style>
