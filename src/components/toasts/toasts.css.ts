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
      0 2px 6px 1px rgba(0, 0, 0, .12),
      0 2px 14px -3px rgba(0, 0, 0, .20)
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
