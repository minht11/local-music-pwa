import { setStyles } from '../../../utils'
import { MenuPosition } from '../types'

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

  setStyles(menuEl, {
    width: `${pos.width}px`,
    height: `${pos.height}px`,
    top: `${top}px`,
    left: `${left}px`,
    'transform-origin': `${pos.originX || 0}px ${pos.originY || 0}px`,
  })
}
