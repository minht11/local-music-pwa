import type { IconType } from '../icon/Icon.svelte'

export type MenuPosition = {
	top: number
	left: number
}

export interface MenuAlign {
	horizontal?: 'left' | 'right'
	vertical?: 'top' | 'bottom'
}

interface MenuAnchorOptions {
	anchor: true
	preferredAlignment?: MenuAlign
}

interface MenuPositionOptions {
	anchor: false
	position: MenuPosition
}

interface MenuSize {
	width?: number
	height?: number
}

export type MenuOptions = (MenuAnchorOptions | MenuPositionOptions) & MenuSize

export interface MenuItem {
	label: string
	icon?: IconType
	selected?: boolean
	action: () => void
}
