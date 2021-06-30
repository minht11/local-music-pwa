import { style, composeStyles, createVar } from '@vanilla-extract/css'
import { vars } from './vars.css'
import { atoms } from './atoms.css'

export const pageContainer = style({
  gridRow: 'content-left/content-right',
  gridColumn: 'content-left/content-right',
  height: '100%',
  width: '100%',
  contain: 'strict',
  transformOrigin: 'center center',
  background: vars.colors.surface0,
})

export const flexColumn = style({
  display: 'flex',
  flexDirection: 'column',
})

export const actions = style({
  display: 'flex',
  alignItems: 'center',
  gap: vars.static.gap.medium,
})

export const scrollContainer = style({
  scrollbarColor: `${vars.colors.content1} transparent`,
  scrollbarWidth: 'thin',
  overflow: 'auto',
  willChange: 'transform',
})

export const controlBaseOpacityVar = createVar()
export const controlSurfaceHslVar = createVar()

export const control = style({
  vars: {
    [controlBaseOpacityVar]: '0%',
    [controlSurfaceHslVar]: vars.colors.contentHsl,
  },
  appearance: 'none',
  border: 'none',
  backgroundColor: 'transparent',
  outline: 'none',
  textDecoration: 'none',
  cursor: 'pointer',
  display: 'flex',
  selectors: {
    '&:hover': {
      backgroundColor: `hsla(${controlSurfaceHslVar}, calc(10% + ${controlBaseOpacityVar}))`,
    },
    '&:disabled': {
      pointerEvents: 'none',
      opacity: 0.54,
    },
    '&:is(:focus-visible, &:hover:focus-visible)': {
      outline: `2px solid ${vars.colors.content1}`,
      outlineOffset: '1px',
      backgroundColor: `hsla(${controlSurfaceHslVar}, calc(15% + ${controlBaseOpacityVar}))`,
    },
  },
})

export const buttonRegular = composeStyles(
  atoms({
    typography: 'button',
  }),
  control,
  style({
    fontFamily: 'inherit',
    height: '36px',
    padding: '0 8px',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: vars.static.radius.medium,
  }),
)

const buttonPill = composeStyles(
  buttonRegular,
  style({
    vars: {
      [controlBaseOpacityVar]: '10%',
    },
    borderRadius: '100px',
    color: vars.colors.content1,
    background: `hsla(${vars.colors.contentHsl}, 10%)`,
    padding: '0 16px',
  }),
)

const primaryColor = style({
  color: vars.colors.primary,
})

export const button = {
  flat: {
    regular: buttonRegular,
    primary: composeStyles(buttonRegular, primaryColor),
  },
  pill: {
    regular: buttonPill,
    primary: composeStyles(buttonPill, primaryColor),
  },
}

export const listItem = composeStyles(
  control,
  atoms({
    radius: 'medium',
  }),
  style({
    width: '100%',
    height: '40px',
    alignItems: 'center',
    flexShrink: 0,
    padding: `0 ${vars.static.gap.large}`,
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    contain: 'content',
    textAlign: 'initial',
  }),
)

export const textField = composeStyles(
  control,
  atoms({
    typography: 'body2',
    paddingX: 'large',
    paddingY: 'none',
    color: 'content1',
    radius: 'large',
  }),
  style({
    MozAppearance: 'none',
    WebkitAppearance: 'none',
    appearance: 'none',
    backgroundColor: `hsla(${vars.colors.contentHsl}, 10%)`,
    outline: 'none !important',
    height: '44px',
    border: `2px solid transparent`,
    width: '100%',
    '::placeholder': {
      color: vars.colors.content2,
    },
    selectors: {
      '&:is(:focus-within)': {
        backgroundColor: `hsla(${vars.colors.contentHsl}, 15%)`,
        borderColor: vars.colors.content1,
      },
    },
  }),
)
