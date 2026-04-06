export interface MenuPosition {
	top: number
	left: number
}

export interface MenuAlignment {
	horizontal?: 'left' | 'right'
	vertical?: 'top' | 'bottom'
}

interface MenuAnchorOptions {
	anchor: true
	preferredAlignment?: MenuAlignment
}

interface MenuPositionOptions {
	anchor: false
	position: MenuPosition
}

interface MenuSize {
	width?: number
	height?: number
}

/** @public */
export type MenuOptions = (MenuAnchorOptions | MenuPositionOptions) & MenuSize

/** @public */
export interface MenuItem {
	label: string
	selected?: boolean
	action: () => void
}
