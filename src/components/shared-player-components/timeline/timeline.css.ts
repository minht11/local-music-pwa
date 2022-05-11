import { style } from '@vanilla-extract/css'
import { sprinkles } from '~/styles/styles.css'

export const timelineContainer = style([
  sprinkles({
    gap: '8px',
    display: 'flex',
    alignItems: 'center',
  }),
  style({
    gridArea: 'timeline',
    height: '32px',
  }),
])

export const time = style([
  sprinkles({
    typography: 'labelSmall',
    flexShrink: 0,
  }),
  style({
    pointerEvents: 'none',
    width: '30px',
  }),
])
