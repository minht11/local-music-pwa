import { assign } from '$lib/helpers/utils'
import type { MenuPosition } from './types'

interface MenuPositioning extends MenuPosition {
	originY?: number
	originX?: number
	width: number
	height: number
}

export const positionMenu = (menuEl: HTMLElement, pos: MenuPositioning) => {
	// Menu can't be placed outside of window bounds.
	const top = Math.min(pos.top, window.innerHeight - pos.height)
	const left = Math.min(pos.left, window.innerWidth - pos.width)

	assign(menuEl.style, {
		width: `${pos.width}px`,
		height: `${pos.height}px`,
		top: `${top}px`,
		left: `${left}px`,
		transformOrigin: `${pos.originX || 0}px ${pos.originY || 0}px`,
	})
}
