import { style, createVar, fallbackVar } from '@vanilla-extract/css'
import { getVarName } from '../../styles/css-helpers'
import { vars } from '../../styles/styles.css'

export const sliderValueVar = createVar()
export const sliderValueVarName = getVarName(sliderValueVar)

const appearance = {
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
} as const

export const sliderTrackColorVar = createVar()
export const sliderProgressColorVar = createVar()

const sliderThumb = {
  ...appearance,
  background: 'currentcolor',
  border: 'none',
  borderRadius: '50%',
  width: '16px',
  height: '16px',
  boxShadow: 'none',
}

const disabled = {
  display: 'none',
  // Firefox
  width: 0,
  height: 0,
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
  background: fallbackVar(sliderTrackColorVar, vars.colors.outline),
  color: fallbackVar(sliderProgressColorVar, vars.colors.primary),
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
