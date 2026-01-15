<script lang="ts" module>
	import IconButton from './IconButton.svelte'
	import type { IconType } from './icon/icon-paths.server.ts'
	import type { MenuAlignment, MenuItem } from './menu/types.ts'

	export type { MenuItem }

	export type ListMenuFn = () => MenuItem[]
</script>

<script lang="ts">
	interface Props {
		class?: ClassValue
		ariaLabel?: string
		tooltip?: string
		tabindex?: number
		alignment?: MenuAlignment
		width?: number
		icon?: IconType
		menuItems?: (() => MenuItem[]) | MenuItem[]
	}

	const {
		class: className,
		ariaLabel,
		tooltip = m.moreOptions(),
		tabindex = 0,
		menuItems,
		alignment = { horizontal: 'right', vertical: 'top' },
		width,
		icon = 'moreVertical',
	}: Props = $props()

	const menu = useMenu()
</script>

<IconButton
	{ariaLabel}
	{tabindex}
	{icon}
	{tooltip}
	class={className}
	onclick={(e) => {
		e.stopPropagation()

		if (!menuItems) {
			return
		}

		menu.showFromEvent(e, typeof menuItems === 'function' ? menuItems() : menuItems, {
			anchor: true,
			width,
			preferredAlignment: alignment,
		})
	}}
/>
