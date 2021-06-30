import { globalStyle } from '@vanilla-extract/css'
import { vars, lightTheme } from './vars.css'

const root = 'html'

globalStyle(root, {
  vars: {
    [vars.colors.hue]: '20deg',
  },

  fontSize: '14px',
  letterSpacing: '0.25px',

  color: vars.colors.content1,
  background: vars.colors.surface0,
  colorScheme: 'dark',
  '@media': {
    '(prefers-color-scheme: light)': {
      vars: lightTheme,
      colorScheme: 'light',
    },
    '(max-height: 440px), (max-width: 320px)': {
      vars: {
        [vars.sizes.toolbarHeight]: '48px',
      },
    },
  },
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
