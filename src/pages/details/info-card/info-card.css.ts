import { style } from '@vanilla-extract/css'
import { sharedStyles, sprinkles } from '~/styles/styles.css'

export const content = style([
  sprinkles({
    display: 'flex',
    tonalElevation: 1,
    radius: '12px',
    flexShrink: 0,
    padding: '16px',
    gap: '16px',
  }),
  style({
    '@media': {
      '(max-width: 600px)': {
        flexDirection: 'column',
        alignItems: 'center',
      },
    },
  }),
])

export const musicImage = style({
  height: '160px',
  width: 'max-content',
})

export const title = style([
  sharedStyles.textEclipse,
  sprinkles({
    typography: 'headlineMedium',
    color: 'onSurface',
  }),
  style({
    whiteSpace: 'nowrap',
  }),
])

export const details = style([
  sprinkles({
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    overflow: 'hidden',
  }),
  style({
    width: '100%',
  }),
])

export const secondary = style([
  sharedStyles.textEclipse,
  sprinkles({
    typography: 'labelLarge',
    color: 'onSurfaceVariant',
  }),
])

export const actions = style([
  sharedStyles.actions,
  style({
    marginTop: 'auto',
  }),
])
