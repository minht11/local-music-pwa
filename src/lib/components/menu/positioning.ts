import { assign } from '$lib/helpers/utils'
import type { MenuAlignment, MenuPosition } from './types.ts'

export const getMeasurementsFromAnchor = (
	menuRect: DOMRect,
	anchor: Element,
	align?: MenuAlignment,
) => {
	const { horizontal: horizontalAlign = 'left', vertical: verticalAlign = 'top' } = align || {}

	const anchorRect = anchor.getBoundingClientRect()
	const { top: aTop, left: aLeft } = anchorRect

	const top = verticalAlign === 'top' ? aTop : anchorRect.bottom - menuRect.height
	const left = horizontalAlign === 'left' ? aLeft : anchorRect.right - menuRect.width

	const originY = Math.abs(aTop - top + anchorRect.height / 2)
	const originX = Math.abs(aLeft - left + anchorRect.width / 2)

	const position = {
		top,
		left,
		originY,
		originX,
	}

	return position
}

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
