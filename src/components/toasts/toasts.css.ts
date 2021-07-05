import { style, composeStyles } from '@vanilla-extract/css'
import { sharedStyles, atoms } from '../../styles/styles.css'

export const container = composeStyles(
  atoms({
    gap: 'medium',
    padding: 'medium',
    display: 'flex',
    flexDirection: 'column',
  }),
  style({
    width: '100%',
    alignSelf: 'end',
    zIndex: 3,
    position: 'absolute',
  }),
)

export const toastItem = composeStyles(
  atoms({
    gap: 'medium',
    display: 'flex',
    alignItems: 'center',
    paddingY: 'medium',
    paddingLeft: 'large',
    paddingRight: 'medium',
    surface: 'surface4',
    radius: 'large',
  }),
  style({
    minHeight: '48px',
    boxShadow: `
      rgba(0, 0, 0, 0.1) 0px 10px 15px -3px,
      rgba(0, 0, 0, 0.05) 0px 4px 6px -2px
    `,
  }),
)

export const message = style({
  minHeight: '12px',
})

export const buttons = composeStyles(
  sharedStyles.actions,
  style({
    marginLeft: 'auto',
  }),
)

export const btn = sharedStyles.button.flat.primary
