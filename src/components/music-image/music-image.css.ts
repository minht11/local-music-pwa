import { style } from '@vanilla-extract/css'
import { vars, sprinkles } from '../../styles/styles.css'

export const musicImage = style([
  sprinkles({
    flexShrink: 0,
  }),
  style({
    borderRadius: 'max(8px, 20%)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    fill: vars.colors.tertiary,
    backgroundColor: `rgba(${vars.colors.primaryRgb}, .02)`,
    boxShadow: `inset 0 0 0 1px rgba(${vars.colors.primaryRgb}, .2)`,
  }),
])

export const round = style({
  borderRadius: '50%',
})
