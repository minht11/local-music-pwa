import { style } from '@vanilla-extract/css'
import { sprinkles } from '../../styles/styles.css'

export const section = style([
  sprinkles({
    typography: 'bodyLarge',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    tonalElevation: 1,
  }),
  style({
    borderRadius: '12px',
    width: '100%',
    maxWidth: '460px',
    margin: '48px auto',
    textAlign: 'center',
    padding: `48px 16px`,
  }),
])

export const logo = style({
  height: '96px',
  width: '96px',
})

export const title = sprinkles({
  typography: 'headlineMedium',
  color: 'onSurface',
})
