import { composeStyles, style } from '@vanilla-extract/css'
import { atoms, sharedStyles } from '../../styles/styles.css'
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
  selectors: {
    'html[app-not-supported] &': {
      display: 'none',
    },
  },
})

export const toastArea = style({
  gridArea: 'content-left',
})

export const toastPlayerOpenArea = style({
  gridRow: 'content-left/player',
  gridColumn: 'content-left',
})

export const emptyPlayerPage = composeStyles(
  atoms({
    surface: 'surface1',
  }),
  style({
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: -1,
  }),
)

export const { pointerEventsNone } = sharedStyles
