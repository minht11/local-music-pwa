import { style } from '@vanilla-extract/css'
import { trailingSizeVar } from '~/components/list-item/list-item.css'
import { sprinkles, sharedStyles } from '../../../styles/styles.css'

export const container = style({
  width: '100%',
})

const smallWidthMedia = '(max-width: 440px)'
const extraSmallWidthMedia = '(max-width: 256px)'

export const compact = style({
  vars: {
    [trailingSizeVar]: '36px',
  },
})

export const narrow = style({
  vars: {
    [trailingSizeVar]: '0px',
  },
})

export const small = style({})

export const extraSmall = style({})

export const firstColumn = style([
  sprinkles({
    typography: 'bodyLarge',
  }),
  style({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '24px',
  }),
])

export const artwork = style({
  height: '40px',
  width: '40px',
  contain: 'strict',
  '@media': {
    [extraSmallWidthMedia]: {
      display: 'none',
    },
  },
})

export const album = style([
  sharedStyles.textEclipse,
  style({
    selectors: {
      [`${compact} &`]: {
        display: 'none',
      },
    },
  }),
])

export const time = style([
  sharedStyles.textEclipse,
  style({
    marginLeft: 'auto',
    flexShrink: 0,
    '@media': {
      [smallWidthMedia]: {
        display: 'none',
      },
    },
  }),
])
