import { style, keyframes } from '@vanilla-extract/css'
import { sharedStyles, vars } from '~/styles/styles.css'

export const controls = style([
  sharedStyles.actions,
  style({
    gridArea: 'controls',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  }),
])

export const enabled = style({
  color: vars.colors.primary,
})

export const enabledIndicator = style({
  position: 'absolute',
  width: '4px',
  height: '4px',
  bottom: '4px',
  borderRadius: '50%',
  background: vars.colors.primary,
  transform: 'scale(0)',
  transition: 'transform .3s',
  selectors: {
    [`${enabled} + &`]: {
      transform: 'none',
    },
  },
})

export const playPauseButton = style([
  sharedStyles.filledButton,
  style({
    width: '72px',
    borderRadius: '22px',
    height: '44px',
    padding: 0,
    flexShrink: 0,
    '@media': {
      '(max-width: 300px)': {
        width: '44px',
        height: '44px',
      },
    },
  }),
])

export const playing = style({})

export const playPauseIcon = style({
  // Animation causes other nearby elements to
  // repaint aswell. Z-index isolates repaint only to this element.
  zIndex: 1,
  position: 'relative',
  height: '24px',
  width: '24px',
  transition: 'transform .2s ease-out',
  selectors: {
    [`&${playing}`]: {
      transform: 'rotate(90deg)',
    },
  },
})

export const playPauseIconBar = style({
  background: 'currentcolor',
  height: '50%',
  clipPath: 'polygon(32% 40%, 82% 102%, 82% 102%, 32% 102%)',
  transition: 'clip-path .2s ease-out',
  selectors: {
    [`${playing} &`]: {
      clipPath: 'polygon(22% 50%, 80% 50%, 80% 84%, 22% 84%)',
    },
  },
})

export const flippedY = style({
  transform: 'scaleY(-1)',
})

export const flippedX = style({
  transform: 'scaleX(-1)',
})

export const animating = style({})

const animatedIcon = style({
  fill: 'currentcolor',
  pointerEvents: 'none',
  width: '24px',
  height: '24px',
  flexShrink: 0,
})

export const skipIconClip = style({
  clipPath: 'inset(0 6px 0 0)',
  height: '24px',
})

export const skipIcon = animatedIcon

const skipTopAni = keyframes({
  from: {
    transform: 'translate(0px,0px)',
  },
  to: {
    transform: 'translate(10px,0px)',
  },
})

export const skipTop = style({
  selectors: {
    [`${animating} &`]: {
      animation: `${skipTopAni} .2s ease-out`,
    },
  },
})

const skipBottomAni = keyframes({
  from: {
    transform: 'translate(5px, 0) scale(0)',
  },
  to: {
    transform: 'translate(0, 0) scale(1, 1)',
  },
})

export const skipBottom = style({
  visibility: 'hidden',
  selectors: {
    [`${animating} &`]: {
      visibility: 'visible',
      transformOrigin: 'left center',
      animation: `${skipBottomAni} .2s ease-out`,
    },
  },
})

export const repeatIcon = animatedIcon

const repeatPathAni = keyframes({
  from: {
    transform: 'rotate(0deg)',
  },
  to: {
    transform: 'rotate(180deg)',
  },
})

export const repeatPath = style({
  selectors: {
    [`${animating} &`]: {
      transformOrigin: 'center center',
      animation: `${repeatPathAni} .325s cubic-bezier(0.0, 0.0, 0.2, 1)`,
    },
  },
})
export const repeatPathOne = style({
  transformOrigin: 'center center',
  transform: 'scale(0)',
  transition: 'transform 200ms',
})

export const repeatPathOneVisible = style({
  transform: 'scale(1, 1)',
})

const SHUFFLE_ANI_DURATION = 175
export const SHUFFLE_ANI_DURATION_TOTAL = SHUFFLE_ANI_DURATION * 2

export const shuffleIcon = style([
  animatedIcon,
  style({
    position: 'relative',
    selectors: {
      [`${animating} &`]: {
        transition: `color 0s ${SHUFFLE_ANI_DURATION}ms`,
      },
    },
  }),
])

const shuffleArrowExitAni = keyframes({
  '0%': {
    clipPath:
      'polygon(60.21% 16.6%, 83.28% 16.63%, 83.41% 39.72%, 74.82% 31.18%, 22.63% 83.37%, 16.6% 77.36%, 68.9% 25.21%)',
  },
  '20%': {
    clipPath:
      'polygon(63.31% 16.6%, 83.28% 16.63%, 83.41% 36.34%, 76.51% 29.35%, 45.15% 60.71%, 39.26% 54.83%, 70.45% 23.66%)',
  },
  '40%': {
    clipPath:
      'polygon(68.80% 16.46%, 83.28% 16.63%, 83.69% 30.71%, 79.74% 25.98%, 51.77% 54.23%, 45.59% 48.5%, 73.54% 20.57%)',
  },
  '60%': {
    clipPath:
      'polygon(77.25% 16.88%, 83.28% 16.63%, 83.55% 22.4%, 83.54% 22.46%, 66.13% 40.16%, 59.67% 34.42%, 77.2% 16.63%)',
  },
  '100%': {
    clipPath:
      'polygon(80.07% 14.21%, 83.42% 16.91%, 86.37% 19.73%, 86.36% 19.79%, 86.82% 20.03%, 79.79% 14.28%, 79.87% 14.24%)',
  },
})

const shuffleArrowEnterAni = keyframes({
  '0%': {
    clipPath:
      'polygon(16.71% 77.41%, 19.79% 80.68%, 22.6% 83.36%, 22.6% 83.26%, 22.63% 83.37%, 16.6% 77.36%, 16.82% 77.29%)',
  },
  '20%': {
    clipPath:
      'polygon(29.24% 64.6%, 32.04% 67.73%, 34.99% 70.69%, 34.99% 70.73%, 22.63% 83.37%, 16.6% 77.36%, 29.21% 64.76%)',
  },
  '40%': {
    clipPath:
      'polygon(35.86% 49.54%, 49.49% 50.41%, 50.33% 63.23%, 46.39% 59.47%, 22.63% 83.37%, 16.6% 77.36%, 40.33% 53.78%)',
  },
  '60%': {
    clipPath:
      'polygon(45.85% 29.55%, 69.89% 29.85%, 72.43% 52.24%, 62.01% 43.85%, 22.63% 83.37%, 16.6% 77.36%, 55.26% 38.58%)',
  },
  '100%': {
    clipPath:
      'polygon(60.21% 16.6%, 83.28% 16.63%, 83.41% 39.72%, 74.82% 31.18%, 22.63% 83.37%, 16.6% 77.36%, 68.9% 25.21%)',
  },
})

export const shuffleArrow = style({
  position: 'absolute',
  width: '100%',
  height: '100%',
  background: 'currentcolor',
  clipPath:
    'polygon(60.21% 16.6%, 83.28% 16.63%, 83.41% 39.72%, 74.82% 31.18%, 22.63% 83.37%, 16.6% 77.36%, 68.9% 25.21%)',
  selectors: {
    [`${animating} &`]: {
      animation: `
        ${shuffleArrowExitAni} ${SHUFFLE_ANI_DURATION}ms cubic-bezier(0.4, 0.0, 1, 1),
        ${shuffleArrowEnterAni} ${SHUFFLE_ANI_DURATION}ms ${SHUFFLE_ANI_DURATION}ms cubic-bezier(0.0, 0.0, 0.2, 1)`,
    },
  },
})

export const shuffleIntersectionClip = style({
  height: '100%',
  width: '100%',
  clipPath:
    'polygon(0% 83%, 0% 0%, 100% 0%, 100% 100%, 18% 100%, 100% 18%, 83% 0%)',
})

export const shuffleArrowFlipped = style([shuffleArrow, flippedY])

export const shuffleMaskSvg = style({
  position: 'absolute',
  pointerEvents: 'none',
})

export const shuffleClipRect = style({
  transform: 'rotate(-45deg)',
  transformOrigin: 'center',
})
