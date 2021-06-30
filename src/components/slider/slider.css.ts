import { style, createVar } from '@vanilla-extract/css'
import { vars } from '../../styles/styles.css'

export const sliderValueVar = createVar()

const appearance = {
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
} as const

const sliderThumb = {
  ...appearance,
  background: 'currentcolor',
  border: 'none',
  borderRadius: '50%',
  width: '16px',
  height: '16px',
}

const disabled = {
  display: 'none',
}

export const slider = style({
  ...appearance,
  cursor: 'pointer',
  width: '100%',
  border: 'none',
  height: '4px',
  outline: 'none',
  margin: 0,
  borderRadius: '4px',
  color: 'inherit',
  background: `hsla(${vars.colors.contentHsl}, 20%)`,
  selectors: {
    '&::-moz-range-progress': {
      ...appearance,
      background: 'currentColor',
    },
    '&::-webkit-slider-container': {
      ...appearance,
      borderRadius: 'inherit',
      background: `linear-gradient(
        to right,
        currentColor ${sliderValueVar},
        transparent 0%
      )`,
    },
    '&::-webkit-slider-thumb': sliderThumb,
    '&::-moz-range-thumb': sliderThumb,
    '&:disabled::-webkit-slider-thumb': disabled,
    '&:disabled::-moz-range-thumb': disabled,
    '&:focus-visible': {
      outline: '2px solid currentColor',
      outlineOffset: '6px',
    },
  },
})
