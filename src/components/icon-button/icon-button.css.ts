import { style } from '@vanilla-extract/css'
import { sharedStyles, sprinkles } from '../../styles/styles.css'

export const iconButton = style([
  sharedStyles.flatButtonBase,
  sprinkles({
    overflow: 'hidden',
    flexShrink: 0,
  }),
  style({
    borderRadius: '50%',
    height: '44px',
    width: '44px',
    transition: 'border-radius .2s linear',
    color: 'inherit',
    selectors: {
      '&:active': {
        borderRadius: '12px',
      },
    },
  }),
])
