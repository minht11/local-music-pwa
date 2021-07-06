import {
  style,
  composeStyles,
  createVar,
  fallbackVar,
} from '@vanilla-extract/css'
import { atoms } from '../../styles/styles.css'

// Mobile browsers do not have stable vh values.
export const windowHeightVar = createVar()
export const miniPlayerHeightVar = createVar()

export const playerContainer = style({
  vars: {
    [miniPlayerHeightVar]: '96px',
    '--mini-player-height': '96px',
  },
  height: miniPlayerHeightVar,
  width: '100%',
  pointerEvents: 'none',
  gridArea: 'player',
  '@media': {
    '(max-width: 700px), (max-height: 400px)': {
      vars: {
        [miniPlayerHeightVar]: '64px',
      },
    },
    [`(max-width: 480px) and (max-height: 440px),
    (max-width: 440px) and (max-height: 480px),
    (max-height: 440px)`]: {
      vars: {
        [miniPlayerHeightVar]: '52px',
      },
    },
  },
})

export const card = composeStyles(
  atoms({
    surface: 'surface2',
    alignItems: 'center',
    radiusTop: 'veryLarge',
  }),
  style({
    width: '100%',
    overflow: 'hidden',
    bottom: 0,
    zIndex: 1,
    pointerEvents: 'all',
    position: 'absolute',
    minHeight: miniPlayerHeightVar,
  }),
)

export const fpContainer = style({
  width: '100%',
  height: fallbackVar(windowHeightVar, '100vh'),
  display: 'flex',
  contain: 'strict',
})
