import { style } from '@vanilla-extract/css'
import { sharedStyles, sprinkles } from '~/styles/styles.css'

export const { flatButton } = sharedStyles

const modalBase = style({
  width: '100%',
  maxWidth: '320px',
  minHeight: '160px',
  maxHeight: '100vh',
  zIndex: 3,
  position: 'relative',
  gridArea: 'modal',
  pointerEvents: 'all',
})

export const modal = style([
  modalBase,
  sprinkles({
    radius: '24px',
    surface: 'surface',
    tonalElevation: 3,
    display: 'flex',
    flexDirection: 'column',
    color: 'onSurface',
  }),
])

export const header = sprinkles({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  paddingX: '24px',
  paddingTop: '24px',
})

export const title = sprinkles({
  typography: 'headlineSmall',
})

export const content = style([
  style({
    maxHeight: '400px',
  }),
])

export const bottomButtons = style([
  sharedStyles.actions,
  sprinkles({
    justifyContent: 'flex-end',
    paddingX: '16px',
    paddingBottom: '16px',
  }),
  style({
    marginTop: 'auto',
  }),
])
