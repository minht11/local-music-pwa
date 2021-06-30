import { style, composeStyles } from '@vanilla-extract/css'
import { sharedStyles } from '../../styles/styles.css'

export const iconButton = composeStyles(
  sharedStyles.button.flat.regular,
  style({
    borderRadius: '50%',
    height: '44px',
    width: '44px',
    overflow: 'hidden',
    flexShrink: 0,
    transition: 'border-radius .2s linear',
    color: 'inherit',
    selectors: {
      '&:active': {
        borderRadius: '12px',
      },
    },
  }),
)
