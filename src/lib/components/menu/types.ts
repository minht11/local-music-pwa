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

interface MenuSheetOptions {
	/** Set to false to always use a popup menu instead of a bottom sheet on mobile. Leave undefined for auto behavior. */
	bottomSheet?: boolean
}

/** @public */
export type MenuOptions = (MenuAnchorOptions | MenuPositionOptions) & MenuSize & MenuSheetOptions

/** @public */
export interface MenuActionItem {
	label: string
	selected?: boolean
	action: () => void
}

export interface MenuSeparatorItem {
	separator: true
}

/** @public */
export type MenuItem = MenuActionItem | MenuSeparatorItem

export interface MenuInternalData {
	items: MenuItem[]
	targetElement: HTMLElement
	options?: MenuOptions
	bottomSheet: boolean
}
