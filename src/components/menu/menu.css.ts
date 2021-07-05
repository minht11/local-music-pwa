import { style, composeStyles } from '@vanilla-extract/css'
import { sharedStyles, atoms, vars } from '../../styles/styles.css'

export const overlay = style({
  position: 'fixed',
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 5,
})

export const menu = composeStyles(
  atoms({
    padding: 'small',
    radius: 'medium',
    display: 'flex',
    flexDirection: 'column',
    surface: 'surface3',
  }),
  style({
    width: '200px',
    position: 'fixed',
    willChange: 'transform, opacity',
    zIndex: 5,
    boxShadow: `
      rgba(0, 0, 0, 0.18) 0px 20px 25px -5px,
      rgba(0, 0, 0, 0.06) 0px 10px 10px -5px
    `,
  }),
)

export const menuItem = sharedStyles.listItem
export const selected = style({
  color: vars.colors.primary,
})

export const scrimVisible = style({
  background: vars.colors.scrim,
})

export const scrim = style({
  position: 'fixed',
  width: '100%',
  height: '100%',
  top: 0,
  left: 0,
  zIndex: 4,
})
