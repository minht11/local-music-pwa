import { style } from '@vanilla-extract/css'
import { sharedStyles, sprinkles, vars } from '~/styles/styles.css'

export const elavated = sprinkles({
  tonalElevation: 2,
})

export const appTobBar = style([
  sprinkles({
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  }),
  style({
    gridArea: 'toolbar',
    color: vars.colors.onSurface,
    width: '100%',
  }),
])

export const content = style([
  sharedStyles.actions,
  sprinkles({
    paddingX: '16px',
  }),
  style({
    width: '100%',
    height: vars.sizes.headerHeight,
  }),
])

export const title = sprinkles({
  typography: 'titleLarge',
})

export const spacer = style({
  flex: 1,
})
