import { style } from '@vanilla-extract/css'
import { sharedStyles, sprinkles } from '~/styles/styles.css'

export const { outlinedButton } = sharedStyles

export const title = sprinkles({
  typography: 'headlineSmall',
  color: 'onSurface',
})

export const messageBanner = style([
  sprinkles({
    typography: 'titleMedium',
    display: 'flex',
    flexDirection: 'column',
    color: 'onSurfaceVariant',
    rowGap: '16px',
    justifyContent: 'center',
    alignItems: 'center',
  }),
  style({
    textAlign: 'center',
    margin: 'auto',
  }),
])
