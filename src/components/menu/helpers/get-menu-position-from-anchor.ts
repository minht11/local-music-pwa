import { MenuAlign } from '../types'

export const getMeasurementsFromAnchor = (
  menuRect: DOMRect,
  anchor: HTMLElement,
  align?: MenuAlign,
) => {
  const {
    horizontal: horizontalAlign = 'left',
    vertical: verticalAlign = 'top',
  } = align || {}

  const anchorRect = anchor.getBoundingClientRect()
  const { top: aTop, left: aLeft } = anchorRect

  const top =
    verticalAlign === 'top' ? aTop : anchorRect.bottom - menuRect.height
  const left =
    horizontalAlign === 'left' ? aLeft : anchorRect.right - menuRect.width

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
