<script lang="ts" context="module">
	import { ripple } from '$lib/actions/ripple'
	import IconButton from './IconButton.svelte'
	import type { MenuItem } from './menu/types'

	export type { MenuItem }

	export type ListMenuFn = () => MenuItem[]
</script>

<script lang="ts">
	interface Props {
		style?: string
		class?: string
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
	class={clx(
		className,
		'cursor-pointer hover:bg-onSurface/10 rounded-8px overflow-hidden pl-16px pr-8px flex items-center',
	)}
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

	<IconButton
		tabindex={-1}
		icon="moreVertical"
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
</div>
