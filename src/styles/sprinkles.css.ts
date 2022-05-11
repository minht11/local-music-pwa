import {
  createSprinkles,
  defineProperties,
} from '@vanilla-extract/sprinkles'
import { vars } from './vars.css'
import * as typographyAtomValues from './typography-properties.css'

const surfaceColors = {
  primary: vars.colors.primary,
  primaryContainer: vars.colors.primaryContainer,
  secondary: vars.colors.secondary,
  secondaryContainer: vars.colors.secondaryContainer,
  tertiary: vars.colors.tertiary,
  tertiaryContainer: vars.colors.tertiaryContainer,
  error: vars.colors.error,
  errorContainer: vars.colors.errorContainer,
  surface: vars.colors.surface,
  surfaceVariant: vars.colors.surfaceVariant,
  inverseSurface: vars.colors.inverseSurface,
}

const contentColors = {
  primary: vars.colors.primary,
  onPrimary: vars.colors.onPrimary,
  onPrimaryContainer: vars.colors.onPrimaryContainer,
  secondary: vars.colors.secondary,
  onSecondary: vars.colors.onSecondary,
  onSecondaryContainer: vars.colors.onSecondaryContainer,
  tertiary: vars.colors.tertiary,
  onTertiary: vars.colors.onTertiary,
  onTertiaryContainer: vars.colors.onTertiaryContainer,
  error: vars.colors.error,
  onError: vars.colors.onError,
  onErrorContainer: vars.colors.onErrorContainer,
  onSurface: vars.colors.onSurface,
  onSurfaceVariant: vars.colors.onSurfaceVariant,
  inverseOnSurface: vars.colors.inverseOnSurface,
}

const colorProperties = defineProperties({
  properties: {
    backgroundColor: surfaceColors,
    color: contentColors,
  },
  shorthands: {
    surface: ['backgroundColor'],
  },
})

const typographyProperties = defineProperties({
  properties: {
    fontSize: typographyAtomValues.fontSizes,
    letterSpacing: typographyAtomValues.letterSpacing,
    fontWeight: typographyAtomValues.fontWeight,
  },
  shorthands: {
    typography: ['fontSize', 'letterSpacing', 'fontWeight'],
  },
})

const paddingSize = {
  '4px': '4px',
  '8px': '8px',
  '16px': '16px',
  '24px': '24px',
}
const paddingProperties = defineProperties({
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

const RADIUS_SIZE = {
  '4px': '4px',
  '8px': '8px',
  '12px': '12px',
  '24px': '24px',
}

const radiusProperties = defineProperties({
  properties: {
    borderRadius: RADIUS_SIZE,
  },
  shorthands: {
    radius: ['borderRadius'],
  },
})

const gapSize = {
  '4px': '4px',
  '8px': '8px',
  '16px': '16px',
  '24px': '24px',
}
const gapProperties = defineProperties({
  properties: {
    rowGap: gapSize,
    columnGap: gapSize,
  },
  shorthands: {
    gap: ['columnGap', 'rowGap'],
  },
})

const tonalElavation = {
  1: `linear-gradient(0deg, rgba(${vars.colors.primaryRgb}, 5%) 0%, rgba(${vars.colors.primaryRgb}, 5%) 0%)`,
  2: `linear-gradient(0deg, rgba(${vars.colors.primaryRgb}, 8%) 0%, rgba(${vars.colors.primaryRgb}, 8%) 0%)`,
  3: `linear-gradient(0deg, rgba(${vars.colors.primaryRgb}, 11%) 0%, rgba(${vars.colors.primaryRgb}, 11%) 0%)`,
  4: `linear-gradient(0deg, rgba(${vars.colors.primaryRgb}, 12%) 0%, rgba(${vars.colors.primaryRgb}, 12%) 0%)`,
}

const tonalElavationProperties = defineProperties({
  properties: {
    backgroundImage: tonalElavation,
  },
  shorthands: {
    tonalElevation: ['backgroundImage'],
  },
})

const commonProperties = defineProperties({
  properties: {
    userSelect: ['none', 'text'],
    display: ['flex', 'block'],
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
    flexShrink: [0, 1],
    overflow: ['hidden', 'auto'],
  },
})

export const sprinkles = createSprinkles(
  commonProperties,
  paddingProperties,
  radiusProperties,
  gapProperties,
  typographyProperties,
  tonalElavationProperties,
  colorProperties,
)
