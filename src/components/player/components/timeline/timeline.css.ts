import { style } from '@vanilla-extract/css'

export const timelineContainer = style({
  display: 'flex',
  alignItems: 'center',
  position: 'relative',
  height: '24px',
  gridArea: 'timeline',
})

export const time = style({
  fontSize: '12px',
  fontWeight: 500,
  pointerEvents: 'none',
  position: 'absolute',
  right: 0,
  bottom: '-10px',
})
