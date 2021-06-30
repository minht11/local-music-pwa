import { style, composeStyles } from '@vanilla-extract/css'
import { atoms } from '../../../../styles/styles.css'

export const animating = style({})
export const volumeOff = style({})
export const volumeLow = style({})

export const volumeIcon = style({
  fill: 'currentcolor',
  pointerEvents: 'none',
})

export const volume45 = style({
  transform: 'rotate(-45deg)',
  transformOrigin: 'center',
  transition: 'transform 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
})

export const volumeClipCross = style({
  selectors: {
    [`${volumeIcon}:not(${volumeOff}) &`]: {
      transform: 'translate(-18px, -18px) rotate(-45deg)',
    },
  },
})

export const volumeClipTop = style({
  selectors: {
    [`${volumeOff} &`]: {
      transform: 'translate(16px, 16px) rotate(-45deg)',
    },
  },
})

export const volumeWaveHigh = style({
  transformOrigin: 'center',
  transition: 'transform 100ms',
  transform: 'scale(1)',
  selectors: {
    [`${volumeLow} &`]: {
      transform: 'scale(0)',
    },
  },
})

export const volumeControl = composeStyles(
  atoms({
    display: 'flex',
    alignItems: 'center',
    gap: 'large',
  }),
  style({
    gridArea: 'volume',
  }),
)
