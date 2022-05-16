import { keyframes, style } from '@vanilla-extract/css'
import { sprinkles, sharedStyles, vars } from '~/styles/styles.css'
import {
  EASING_INCOMING_80,
  EASING_OUTGOING_40,
  fadeInAni,
  fadeOutAni,
} from '~/styles/shared.css'
import '~/styles/global.css'

export const { interactable } = sharedStyles

export const appContainer = style({
  height: '100%',
  width: '100%',
  overflow: 'hidden',
  position: 'relative',
  selectors: {
    'html[app-not-supported] &': {
      display: 'none',
    },
  },
})

export const pages = style({
  height: '100%',
  width: '100%',
})

export const bottomOverlay = style([
  sprinkles({
    gap: '8px',
    display: 'flex',
    flexDirection: 'column',
    padding: '8px',
    alignItems: 'center',
    overflow: 'hidden',
  }),
  style({
    position: 'absolute',
    bottom: 0,
    width: '100%',
    zIndex: 2,
    transition: 'transform .2s',
    pointerEvents: 'none',
    scrollbarGutter: 'stable',
  }),
])

export const bottomNavBarVisible = style({
  transform: 'translateY(-64px)',
})

export const loadingIndicator = style({
  position: 'absolute',
  top: '0',
  width: '100%',
  height: '4px',
  zIndex: 1,
  background: vars.colors.surfaceVariant,
  display: 'none',
})

const loadingAppearAni = keyframes({
  from: {
    opacity: 0,
  },
})

const loadingAni = keyframes({
  to: {
    transform: 'translateX(100%)',
  },
})

export const loadingIndicatorEnabled = style({
  display: 'block',
  animation: `${loadingAppearAni} .2s .4s both`,
  ':before': {
    content: '""',
    display: 'block',
    position: 'absolute',
    top: 0,
    width: '100%',
    height: '100%',
    transform: 'translateX(-100%)',
    background: vars.colors.primary,
    animation: `${loadingAni} .8s .4s infinite`,
  },
})

const itemEnterAni = keyframes({
  from: {
    transform: 'translateY(40px)',
  },
})

const itemExitAni = keyframes({
  to: {
    transform: 'translateY(40px)',
  },
})

export const itemEnter = style({
  animation: `
    ${itemEnterAni} 150ms ${EASING_INCOMING_80},
    ${fadeInAni} 100ms linear
  `,
})

export const itemExit = style({
  animation: `
    ${itemExitAni} 150ms ${EASING_OUTGOING_40},
    ${fadeOutAni} 100ms 50ms linear
  `,
})
