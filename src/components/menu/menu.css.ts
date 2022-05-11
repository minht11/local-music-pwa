import { style } from '@vanilla-extract/css'
import { sharedStyles, sprinkles, vars } from '~/styles/styles.css'

export const overlay = style({
  position: 'fixed',
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 5,
})

export const menu = style([
  sprinkles({
    padding: '4px',
    display: 'flex',
    flexDirection: 'column',
    tonalElevation: 4,
    surface: 'surface',
  }),
  style({
    borderRadius: '12px',
    padding: '12px 0',
    width: '200px',
    position: 'fixed',
    willChange: 'transform, opacity',
    zIndex: 5,
    // boxShadow: `
    //   rgba(0, 0, 0, 0.18) 0px 20px 25px -5px,
    //   rgba(0, 0, 0, 0.06) 0px 10px 10px -5px
    // `,
    boxShadow: `
      0px 1px 3px 0px #0000004D,
      0px 4px 8px 3px #00000026
    `,
  }),
])

export const menuItem = sharedStyles.listItem
export const selected = style({
  color: vars.colors.primary,
})
