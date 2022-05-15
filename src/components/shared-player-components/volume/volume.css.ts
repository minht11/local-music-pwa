import { style } from '@vanilla-extract/css'
import { sliderProgressColorVar } from '~/components/slider/slider.css'
import { sprinkles } from '~/styles/sprinkles.css'

export const animating = style({})
export const volumeOff = style({})
export const volumeLow = style({})

export const volumeIcon = style({
  fill: 'currentcolor',
  pointerEvents: 'none',
  height: '24px',
  width: '24px',
  flexShrink: 0,
})

export const volume45 = style({
  transform: 'rotate(-45deg)',
  transformOrigin: 'center center',
})

export const volumeCrossLine = style({
  transform: 'scaleY(0)',
  transformOrigin: 'top',
  transition: 'transform 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
  selectors: {
    [`${volumeOff} &`]: {
      transform: 'none',
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

export const volumeSlider = style({
  vars: {
    [sliderProgressColorVar]: 'currentColor',
  },
  maxWidth: '124px',
  marginLeft: 'auto!important',
})

export const volumeControl = style([
  sprinkles({
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  }),
  style({
    gridArea: 'volume',
  }),
])
