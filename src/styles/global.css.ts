import { globalStyle } from '@vanilla-extract/css'
import { vars, defaultDarkTheme, defaultLightTheme } from './vars.css'

const root = 'html'

globalStyle(root, {
  vars: defaultDarkTheme,
  fontFamily: '"Fira Sans", system-ui, sans-serif',
  fontSize: '14px',
  letterSpacing: '0.25px',
  color: vars.colors.onBackground,
  background: vars.colors.background,
  colorScheme: 'dark',
  '@media': {
    '(prefers-color-scheme: light)': {
      vars: defaultLightTheme,
      colorScheme: 'light',
    },
    '(max-height: 440px), (max-width: 320px)': {
      vars: {
        [vars.sizes.headerHeight]: '48px',
      },
    },
    '(max-width: 700px), (max-height: 440px)': {
      vars: {
        [vars.sizes.playerCardHeight]: '64px',
      },
    },
  },
})

globalStyle('html, body', {
  margin: 0,
  WebkitTapHighlightColor: 'transparent',
  WebkitUserSelect: 'none',
  userSelect: 'none',
  width: '100%',
  height: '100%',
})

globalStyle('*', {
  boxSizing: 'border-box',
})

globalStyle('h1', {
  margin: 0,
})

globalStyle('a', {
  color: vars.colors.primary,
})

globalStyle('strong', {
  fontWeight: 500,
})

globalStyle('html[app-not-supported] #unsupported-browser', {
  display: 'block',
})
