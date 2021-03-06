import { createAtomicStyles, createAtomsFn } from '@vanilla-extract/sprinkles'
import { vars, surfaceVars } from './vars.css'
import * as typographyAtomValues from './typography-atom.css'

const typographyAtom = createAtomicStyles({
  properties: {
    fontSize: typographyAtomValues.fontSizes,
    letterSpacing: typographyAtomValues.letterSpacing,
    fontWeight: typographyAtomValues.fontWeight,
  },
  shorthands: {
    typography: ['fontSize', 'letterSpacing', 'fontWeight'],
  },
})

const colorAtom = createAtomicStyles({
  properties: {
    color: {
      primary: vars.colors.primary,
      content1: vars.colors.content1,
      content2: vars.colors.content2,
    },
    background: surfaceVars,
  },
  shorthands: {
    surface: ['background'],
  },
})

const paddingSize = vars.static.padding
const paddingAtom = createAtomicStyles({
  properties: {
    paddingTop: paddingSize,
    paddingBottom: paddingSize,
    paddingLeft: paddingSize,
    paddingRight: paddingSize,
    padding: paddingSize,
  },
  shorthands: {
    paddingX: ['paddingLeft', 'paddingRight'],
    paddingY: ['paddingTop', 'paddingBottom'],
  },
})

const radiusSize = vars.static.radius
const borderRadiusAtom = createAtomicStyles({
  properties: {
    borderRadius: radiusSize,
  },
  shorthands: {
    radius: ['borderRadius'],
  },
})

const borderColors = {
  dim: `hsla(${vars.colors.contentHsl}, 12%)`,
  medium: vars.colors.content2,
  bright: vars.colors.content1,
  primary: vars.colors.primary,
}

const borders = {
  none: 'none',
  small: `1px solid ${borderColors.dim}`,
  medium: `2px solid ${borderColors.dim}`,
}

const gapSize = vars.static.gap
const gapAtom = createAtomicStyles({
  properties: {
    rowGap: gapSize,
    columnGap: gapSize,
  },
  shorthands: {
    gap: ['columnGap', 'rowGap'],
  },
})

const atom = createAtomicStyles({
  properties: {
    userSelect: ['none', 'text'],
    display: ['none', 'flex', 'block'],
    flexDirection: ['row', 'column'],
    justifyContent: [
      'stretch',
      'flex-start',
      'center',
      'flex-end',
      'space-around',
      'space-between',
    ],
    alignItems: ['stretch', 'flex-start', 'center', 'flex-end'],
    border: borders,
    borderColor: borderColors,
  },
})

export const atoms = createAtomsFn(
  atom,
  borderRadiusAtom,
  paddingAtom,
  colorAtom,
  gapAtom,
  typographyAtom,
)
