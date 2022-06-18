import { keyframes, style } from '@vanilla-extract/css'
import { EASING_INCOMING_80, fadeInAni, fadeOutAni } from '~/styles/shared.css'
import { sharedStyles, sprinkles, vars } from '~/styles/styles.css'

export const toastItem = style([
  sprinkles({
    gap: '8px',
    display: 'flex',
    alignItems: 'center',
    surface: 'inverseSurface',
    color: 'inverseOnSurface',
    radius: '8px',
  }),
  style({
    padding: `6px 6px 6px 16px`,
    pointerEvents: 'all',
    width: '100%',
    maxWidth: '448px',
    minHeight: '48px',
    boxShadow: `
      rgba(0, 0, 0, 0.1) 0px 10px 15px -3px,
      rgba(0, 0, 0, 0.05) 0px 4px 6px -2px
    `,
  }),
])

export const message = style([
  sprinkles({
    paddingY: '8px',
  }),
  style({
    minHeight: '12px',
  }),
])

export const spinner = style({
  height: '28px',
  width: '28px',
  marginRight: '4px',
})

export const buttons = style([
  sharedStyles.actions,
  style({
    marginLeft: 'auto',
  }),
])

export const btn = style([
  sharedStyles.flatButton,
  style({
    color: vars.colors.inversePrimary,
  }),
])

const toastEnterAni = keyframes({
  from: {
    transform: 'scale(.90)',
  },
})

export const toastEnter = style({
  animation: `
    ${toastEnterAni} 150ms ${EASING_INCOMING_80},
    ${fadeInAni} 45ms linear
  `,
})

export const toastExit = style({
  animation: `${fadeOutAni} 100ms linear`,
})
