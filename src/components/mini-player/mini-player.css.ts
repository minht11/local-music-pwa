import { style } from '@vanilla-extract/css'
import { EASING_OUTGOING_40 } from '../../styles/shared.css'
import { sharedStyles, sprinkles, vars } from '../../styles/styles.css'

export const COMPACT_MEDIA = '(max-width: 700px), (max-height: 440px)'

export const container = style([
  sprinkles({
    columnGap: '16px',
    rowGap: '8px',
    radius: '24px',
    surface: 'secondaryContainer',
    color: 'onSecondaryContainer',
  }),
  style({
    contain: 'strict',
    display: 'grid',
    position: 'relative',
    maxWidth: '900px',
    width: '100%',
    height: vars.sizes.playerCardHeight,
    alignItems: 'center',
    alignContent: 'center',
    padding: '8px 16px 16px',
    gridTemplateRows: 'min-content 44px',
    gridTemplateColumns: 'auto 1fr auto 1fr',
    gridTemplateAreas: `
      'timeline timeline timeline timeline'
      'artwork info controls volume'
    `,
    transition: 'transform .2s cubic-bezier(0.4, 0.0, 0.2, 1)',
    pointerEvents: 'all',
    '@media': {
      [COMPACT_MEDIA]: {
        rowGap: 0,
        padding: '12px',
        borderRadius: '16px',
        columnGap: '8px',
        display: 'flex',
      },
    },
  }),
])

export const infoSection = style([
  sprinkles({
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  }),
  style({
    gridColumn: 'artwork/info',
    marginRight: 'auto',
    width: '100%',
    overflow: 'hidden',
  }),
])

export const openFullPlayerButton = style([
  sharedStyles.flatButtonBase,
  sprinkles({
    gap: '16px',
    alignItems: 'center',
  }),
  style({
    height: '44px',
    borderRadius: '8px',
    padding: 0,
    textAlign: 'initial',
    width: '100%',
  }),
])

export const artworkContainer = style([
  sprinkles({
    radius: '8px',
  }),
  style({
    gridArea: 'artwork',
    height: '44px',
    width: '44px',
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
    marginRight: '8px',
  }),
])

export const artworkArrow = style({
  position: 'absolute',
  inset: 0,
  margin: 'auto',
  background: `rgba(0, 0, 0, 44%)`,
  borderRadius: '100%',
  opacity: 0,
  transform: 'scale(.8)',
  transition: `transform .175s ${EASING_OUTGOING_40}, opacity .175s linear`,
  color: '#fff',
  '@media': {
    '(hover: hover)': {
      selectors: {
        [`${openFullPlayerButton}:is(:hover, :focus) &`]: {
          opacity: 1,
          transform: 'none',
        },
      },
    },
  },
})
