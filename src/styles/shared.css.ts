import { style, keyframes } from '@vanilla-extract/css'
import { vars } from './vars.css'
import { sprinkles } from './sprinkles.css'

export const flexColumn = style({
  display: 'flex',
  flexDirection: 'column',
})

export const actions = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
})

export const textEclipse = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

export const scrollContainer = style({
  scrollbarColor: `${vars.colors.surfaceVariant} transparent`,
  scrollbarWidth: 'thin',
  overflow: 'auto',
  willChange: 'transform',
})

export const interactable = style({
  position: 'relative',
  overflow: 'hidden',
  MozAppearance: 'none',
  WebkitAppearance: 'none',
  appearance: 'none',
  border: 'none',
  outline: 'none',
  textDecoration: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  zIndex: 0,
  '::after': {
    display: 'none',
    content: '',
    position: 'absolute',
    height: '100%',
    width: '100%',
    left: '0',
    top: '0',
    background: 'currentColor',
    zIndex: -1,
    pointerEvents: 'none',
  },
  '@media': {
    // Do not show hover styles on touch devices.
    '(any-hover: hover)': {
      selectors: {
        '&:hover::after': {
          display: 'block',
          opacity: 0.08,
        },
        '&:disabled::after': {
          display: 'none',
        },
      },
    },
  },
  selectors: {
    '&:is(:focus-visible, &:hover:focus-visible)': {
      outline: `2px solid ${vars.colors.onSurface}`,
      outlineOffset: '-2px',
    },
    '&:focus-visible::after': {
      display: 'block',
      opacity: 0.12,
    },
  },
})

export const baseButton = style([
  interactable,
  sprinkles({
    typography: 'labelLarge',
    justifyContent: 'center',
  }),
  style({
    gap: '8px',
    height: '40px',
    borderRadius: '20px',
  }),
])

export const filledButton = style([
  baseButton,
  sprinkles({
    surface: 'primary',
    color: 'onPrimary',
  }),
  style({
    padding: '0 24px',
    ':disabled': {
      background: vars.colors.onSurface,
      color: vars.colors.surface,
      opacity: 0.24,
      cursor: 'auto',
    },
  }),
])

export const tonalButton = style([
  baseButton,
  sprinkles({
    surface: 'secondaryContainer',
    color: 'onSecondaryContainer',
  }),
  style({
    padding: '0 24px',
    ':disabled': {
      background: vars.colors.onSurface,
      color: vars.colors.surface,
      opacity: 0.24,
      cursor: 'auto',
    },
  }),
])

export const outlinedButton = style([
  baseButton,
  sprinkles({ color: 'primary' }),
  {
    background: 'transparent',
    padding: '0 24px',
    border: `1px solid ${vars.colors.outline}`,
  },
  style({
    ':disabled': {
      color: vars.colors.onSurface,
      opacity: 0.38,
      cursor: 'auto',
    },
  }),
])

export const flatButtonBase = style([
  baseButton,
  style({
    background: 'transparent',
    ':disabled': {
      color: vars.colors.onSurface,
      opacity: 0.38,
      cursor: 'auto',
    },
  }),
])

export const flatButton = style([
  flatButtonBase,
  sprinkles({
    color: 'primary',
  }),
  style({
    padding: '0 12px',
  }),
])

export const listItem = style([
  interactable,
  sprinkles({
    paddingLeft: '16px',
    paddingRight: '8px',
  }),
  style({
    width: '100%',
    height: '40px',
    alignItems: 'center',
    flexShrink: 0,
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    contain: 'content',
    textAlign: 'initial',
  }),
])

export const textFieldBase = style({
  MozAppearance: 'none',
  WebkitAppearance: 'none',
  appearance: 'none',
  padding: 0,
  border: 'none',
  width: '100%',
  height: '48px',
  outline: 'none !important',
  background: 'transparent',
  '::placeholder': {
    color: vars.colors.outline,
  },
})

export const textField = style([
  textFieldBase,
  sprinkles({
    typography: 'labelLarge',
    color: 'onSurface',
  }),
  style({
    padding: '0 16px',
    borderRadius: '8px',
    border: `2px solid ${vars.colors.outline}`,
    display: 'flex',
    alignItems: 'center',
    selectors: {
      '&:is(:focus-within)': {
        borderColor: vars.colors.primary,
      },
    },
  }),
])

export const fadeInAni = keyframes({
  from: {
    opacity: 0,
  },
  to: {
    opacity: 1,
  },
})

export const fadeOutAni = keyframes({
  from: {
    opacity: 1,
  },
  to: {
    opacity: 0,
  },
})

export const EASING_INCOMING_80_OUTGOING_40 = 'cubic-bezier(0.4, 0.0, 0.2, 1)'
export const EASING_INCOMING_80 = 'cubic-bezier(0, 0, .2, 1)'
export const EASING_OUTGOING_40 = 'cubic-bezier(.4, 0, 1, 1)'
