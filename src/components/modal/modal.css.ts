import { composeStyles, style } from '@vanilla-extract/css'
import { sharedStyles, atoms } from '../../styles/styles.css'

const modalBase = style({
  width: '100%',
  maxWidth: '320px',
  minHeight: '160px',
  maxHeight: '100vh',
  zIndex: 2,
  position: 'relative',
  gridArea: 'modal',
  pointerEvents: 'all',
})

export const modal = composeStyles(
  modalBase,
  atoms({
    radius: 'veryLarge',
    surface: 'surface3',
    display: 'flex',
    flexDirection: 'column',
  }),
)

export const header = atoms({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'medium',
  padding: 'large',
})

export const title = atoms({
  typography: 'headline1',
})

export const content = composeStyles(
  sharedStyles.scrollContainer,
  atoms({
    padding: 'large',
  }),
  style({
    maxHeight: '400px',
  }),
)

export const bottomButtons = composeStyles(
  sharedStyles.actions,
  atoms({
    justifyContent: 'flex-end',
    paddingX: 'large',
    paddingY: 'medium',
  }),
  style({
    marginTop: 'auto',
  }),
)

export const btn = sharedStyles.button.flat.primary
