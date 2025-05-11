<script lang="ts" module>
	import { ripple } from '$lib/actions/ripple'
	import IconButton from './IconButton.svelte'
	import type { MenuItem } from './menu/types.ts'

	export type { MenuItem }

	export type ListMenuFn = () => MenuItem[]
</script>

<script lang="ts">
	interface Props {
		style?: string
		class?: ClassValue
		ariaLabel?: string
		ariaRowIndex?: number
		tabindex?: number
		children: Snippet
		menuItems?: ListMenuFn
		onclick?: () => void
	}

	const {
		children,
		class: className,
		style,
		ariaLabel,
		ariaRowIndex,
		tabindex = 0,
		menuItems,
		onclick,
	}: Props = $props()

	const menu = useMenu()

	const clickHandler = () => onclick?.()
</script>

<div
	use:ripple
	{style}
	{tabindex}
	class={[
		className,
		'flex cursor-pointer items-center overflow-hidden rounded-lg pr-2 pl-4 -outline-offset-2 contain-content hover:bg-onSurface/10',
	]}
	role="row"
	aria-label={ariaLabel}
	aria-rowindex={ariaRowIndex}
	onclick={clickHandler}
	onkeydown={(e) => {
		if (e.key === 'Enter') {
			clickHandler()
		}
	}}
	oncontextmenu={(e) => {
		if (!menuItems) {
			return
		}

		e.preventDefault()
		menu.showFromEvent(e, menuItems(), {
			anchor: false,
			position: { top: e.y, left: e.x },
		})
	}}
>
	{@render children()}

	{#if menuItems}
		<IconButton
			tabindex={-1}
			icon="moreVertical"
			class="text-onSurfaceVariant"
			tooltip={m.moreOptions()}
			onclick={(e) => {
				e.stopPropagation()

				if (!menuItems) {
					return
				}

				menu.showFromEvent(e, menuItems(), {
					anchor: true,
					preferredAlignment: {
						horizontal: 'right',
						vertical: 'top',
					},
				})
			}}
		/>
	{/if}
</div>
