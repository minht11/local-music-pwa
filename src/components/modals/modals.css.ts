import { style } from '@vanilla-extract/css'
import { vars } from '../../styles/styles.css'

export const modalsContainer = style({
  display: 'grid',
  gridTemplateAreas: '"modal"',
  width: '100%',
  height: '100%',
  position: 'absolute',
  gridTemplateRows: '1fr',
  gridTemplateColumns: '1fr',
  alignItems: 'center',
  justifyItems: 'center',
  pointerEvents: 'none',
})

export const scrim = style({
  width: '100%',
  height: '100%',
  position: 'absolute',
  background: vars.colors.scrim,
  pointerEvents: 'all',
  zIndex: 2,
})
