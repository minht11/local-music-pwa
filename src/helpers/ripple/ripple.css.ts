import { style } from '@vanilla-extract/css'

// 4 is smallest value able to form a circle.
export const rippleDiameter = 4

export const ripple = style({
  width: `${rippleDiameter}px`,
  height: `${rippleDiameter}px`,
  position: 'absolute',
  borderRadius: '50%',
  opacity: 0.2,
  backgroundColor: 'currentColor',
  animationFillMode: 'both',
  contain: 'strict',
  willChange: 'transform, opacity',
  pointerEvents: 'none',
})
