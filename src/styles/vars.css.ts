import {
  assignVars,
  createGlobalTheme,
  createThemeContract,
} from '@vanilla-extract/css'
import { getAppTheme, argbFromHex } from '../helpers/app-theme'

const root = 'html'

export const colorsTheme = createThemeContract({
  primary: null,
  primaryRgb: null,
  onPrimary: null,
  primaryContainer: null,
  onPrimaryContainer: null,
  secondary: null,
  onSecondary: null,
  secondaryContainer: null,
  onSecondaryContainer: null,
  tertiary: null,
  onTertiary: null,
  tertiaryContainer: null,
  onTertiaryContainer: null,
  error: null,
  onError: null,
  errorContainer: null,
  onErrorContainer: null,
  outline: null,
  background: null,
  onBackground: null,
  surface: null,
  onSurface: null,
  surfaceVariant: null,
  onSurfaceVariant: null,
  inverseSurface: null,
  inverseOnSurface: null,
  inversePrimary: null,
})

const DEFAULT_THEME_SEED = argbFromHex('#ffdcc4')

export const defaultDarkTheme = assignVars(
  colorsTheme,
  getAppTheme(DEFAULT_THEME_SEED, true),
)

export const defaultLightTheme = assignVars(
  colorsTheme,
  getAppTheme(DEFAULT_THEME_SEED, false),
)

const colors = {
  ...colorsTheme,
}

const playerSizeVars = createGlobalTheme(root, {
  // padding-bottom 16 + contronls-height: 44px + gap 8px + timeline 24px + padding-top 8px
  playerCardHeight: '100px',
})

const sizesVars = createGlobalTheme(root, {
  maxContentWidth: '2144px',
  headerHeight: '56px',
  playerCardOffset: `calc(${playerSizeVars.playerCardHeight} + 16px)`,
})

export const vars = {
  colors,
  sizes: {
    ...playerSizeVars,
    ...sizesVars,
  },
}
