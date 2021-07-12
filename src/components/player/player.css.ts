import { style, composeStyles, createVar } from '@vanilla-extract/css'
import { atoms, sharedStyles, vars } from '../../styles/styles.css'

export const PLAYER_CARD_ENTER_DURATION = 300
export const PLAYER_CARD_EXIT_DURATION = 250

// Mobile browsers do not have stable vh values.
export const windowHeightVar = createVar()
export const miniPlayerHeightVar = createVar()

export const playerContainer = style({
  vars: {
    [miniPlayerHeightVar]: '96px',
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
  }),
  style({
    borderRadius: `${vars.static.radius.veryLarge} ${vars.static.radius.veryLarge} 0 0`,
    height: miniPlayerHeightVar,
    width: '100%',
    overflow: 'hidden',
    bottom: 0,
    zIndex: 1,
    pointerEvents: 'all',
    position: 'absolute',
    transform: `translateY(calc(100% - ${miniPlayerHeightVar}))`,
    transition: `
      transform ${PLAYER_CARD_EXIT_DURATION}ms cubic-bezier(0.4, 0.0, 0.2, 1),
      height 0s ${PLAYER_CARD_EXIT_DURATION}ms
    `,
    willChange: 'transform',
    '@media': {
      '(prefers-reduced-motion)': {
        transition: 'none',
      },
    },
  }),
)

export const cardOpen = style({
  height: '100%',
  transform: 'none',
  transition: `
    transform ${PLAYER_CARD_ENTER_DURATION}ms cubic-bezier(0.4, 0.0, 0.2, 1),
    height 0s
  `,
})

export const { pointerEventsNone } = sharedStyles
