import { style, composeStyles } from '@vanilla-extract/css'
import { sharedStyles } from '../../../styles/styles.css'

export const searchBox = composeStyles(
  sharedStyles.textField,
  style({
    paddingRight: 0,
    backgroundClip: 'padding-box',
    margin: 'auto',
    maxWidth: '420px',
    width: '100%',
  }),
)

export const searchInput = style({
  MozAppearance: 'none',
  WebkitAppearance: 'none',
  appearance: 'none',
  background: 'transparent',
  border: 'none',
  outline: 'none',
  width: '100%',
  color: 'inherit',
})

export const symmetrySpacer = style({
  // IconButton size and 8px padding
  // to match left side of toolbar
  // so searchbox remains in center.
  maxWidth: '48px',
  flex: 'auto 1 0',
})
