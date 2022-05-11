import { style, globalStyle } from '@vanilla-extract/css'
import { sprinkles } from '~/styles/styles.css'

export const infoContainer = style([
  sprinkles({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'onSecondaryContainer',
  }),
  style({
    gridArea: 'info',
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
    flex: 'auto 1',
  }),
])

const infoBase = style({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
})

globalStyle(`${infoBase} > *`, {
  textOverflow: 'ellipsis',
  overflow: 'hidden',
})

export const info = style([
  sprinkles({
    typography: 'headlineSmall',
  }),
  infoBase,
])

export const titleRegular = sprinkles({
  typography: 'bodyLarge',
})

export const titleBig = sprinkles({
  typography: 'titleLarge',
})

export const secondaryInfoText = sprinkles({
  typography: 'bodyMedium',
})

export const infoFavoriteBtn = style({
  marginLeft: 'auto',
})
