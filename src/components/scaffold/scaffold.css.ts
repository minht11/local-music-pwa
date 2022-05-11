import { style } from '@vanilla-extract/css'
import { sprinkles } from '~/styles/styles.css'

export const container = style([
  sprinkles({
    surface: 'surface',
    overflow: 'hidden',
  }),
  style({
    contain: 'strict',
    gridArea: '1 / 1',
    height: '100%',
    width: '100%',
    transformOrigin: 'center center',
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gridTemplateRows: 'auto 1fr auto',
    gridTemplateAreas: `
      'top-bar top-bar'
      'nav-rail content'
      'bottom-bar bottom-bar'
    `,
  }),
])

export const topBar = style({
  gridArea: 'top-bar',
  display: 'flex',
  flexDirection: 'column',
})

export const navRail = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gridArea: 'nav-rail',
})

export const bottomBar = style({
  gridArea: 'bottom-bar',
})

export const content = style({
  gridArea: 'content',
  height: '100%',
  overflow: 'hidden',
  display: 'flex',
})
