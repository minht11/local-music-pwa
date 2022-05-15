import { style } from '@vanilla-extract/css'
import { sharedStyles, vars, sprinkles } from '~/styles/styles.css'

export const subheader = sprinkles({
  typography: 'titleMedium',
})

export const chipsContainer = style([
  sharedStyles.actions,
  sprinkles({
    paddingX: '16px',
  }),
  style({
    overflowX: 'auto',
    flexShrink: 0,
    scrollbarWidth: 'thin',
  }),
])

export const chip = style([
  sharedStyles.interactable,
  sprinkles({
    radius: '8px',
    paddingRight: '16px',
    paddingLeft: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'onSurfaceVariant',
    typography: 'labelLarge',
  }),
  style({
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    appearance: 'none',
    border: `1px solid ${vars.colors.outline}`,
    fontFamily: 'inherit',
    background: 'transparent',
    height: '32px',
  }),
])

export const chipSelected = style({
  backgroundColor: vars.colors.secondaryContainer,
  color: vars.colors.onSecondaryContainer,
  borderColor: 'transparent',
})

export const chipIcon = style({
  width: '18px',
  height: '18px',
  marginRight: '-18px',
  transform: 'scale(0)',
  transition: 'all .2s ease-in-out',
  selectors: {
    [`${chipSelected} &`]: {
      transform: 'none',
      marginRight: '0',
    },
  },
})

export const resulsTitle = style([
  sprinkles({
    typography: 'titleMedium',
    paddingTop: '24px',
    paddingLeft: '16px',
  }),
  style({
    selectors: {
      '&:first-letter': {
        textTransform: 'capitalize',
      },
    },
  }),
])
