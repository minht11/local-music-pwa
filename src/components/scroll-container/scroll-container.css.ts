import { style } from '@vanilla-extract/css'
import { sharedStyles, vars, sprinkles } from '../../styles/styles.css'

export const scrollContainer = style([
  sharedStyles.scrollContainer,
  sprinkles({
    display: 'flex',
    flexDirection: 'column',
    rowGap: '16px',
    alignItems: 'center',
  }),
  style({
    height: '100%',
    width: '100%',
    scrollbarGutter: 'stable',
  }),
])

export const scrollObserver = style({
  position: 'absolute',
  top: 0,
  height: 0,
  width: '100%',
})

export const playerOverlay = style({
  paddingBottom: `${vars.sizes.playerCardOffset} !important`,
  scrollPaddingBottom: vars.sizes.playerCardOffset,
})

export const playerOverlaySpacer = style({
  height: vars.sizes.playerCardHeight,
  flexShrink: 0,
})

export const contentSizer = style([
  sprinkles({
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    paddingY: '16px',
    paddingX: '8px',
  }),
  style({
    maxWidth: '1280px',
    width: '100%',
    margin: '0 auto',
    flex: 1,
  }),
])
