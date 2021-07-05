import { style } from '@vanilla-extract/css'
import '../../styles/global.css'

export { hueVar } from '../../styles/vars.css'

export const appContainer = style({
  height: '100%',
  width: '100%',
  overflow: 'hidden',
  position: 'relative',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 420px) 1fr',
  gridTemplateRows: '1fr auto',
  gridTemplateAreas: `
    'content-left content-right'
    'player player'
  `,
})

export const toastArea = style({
  gridArea: 'content-left',
})

export const toastPlayerOpenArea = style({
  gridRow: 'content-left/player',
  gridColumn: 'content-left',
})

export const pointerEventsNone = style(
  {
    pointerEvents: 'none',
  },
  'pointer-events-none',
)
