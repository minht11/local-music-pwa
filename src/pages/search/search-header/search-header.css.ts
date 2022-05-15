import { style } from '@vanilla-extract/css'
import { sharedStyles, sprinkles, vars } from '../../../styles/styles.css'

export const searchBox = style([
  sprinkles({
    surface: 'surface',
  }),
  style({
    border: `2px solid ${vars.colors.outline}`,
    overflow: 'hidden',
    display: 'flex',
    paddingLeft: '24px',
    margin: 'auto',
    maxWidth: '420px',
    width: '100%',
    borderRadius: '40px',
  }),
])

export const searchInput = style([
  sharedStyles.textFieldBase,
  sprinkles({
    typography: 'labelLarge',
  }),
  style({
    height: '44px',
    color: 'inherit',
  }),
])

export const symmetrySpacer = style({
  // IconButton size and 8px padding
  // to match left side of toolbar
  // so searchbox remains in center.
  maxWidth: '48px',
  flex: 'auto 1 0',
})

export const searchButtonHidden = style({
  display: 'none',
})
