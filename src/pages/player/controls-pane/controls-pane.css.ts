import { style } from '@vanilla-extract/css'
import { sprinkles } from '~/styles/styles.css'

export const pinned = style({
  maxWidth: '320px',
})

export const CONTENT_GAP = 24
export const CONTROLS_HEIGHT = 224
export const PREFERRED_CONTROLS_WIDTH = 320

export const horizontalLayout = style({})
export const controlsPane = style([
  sprinkles({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    overflow: 'hidden',
    surface: 'secondaryContainer',
    color: 'onSecondaryContainer',
  }),
  style({
    width: '100%',
    height: '100%',
  }),
])

export const content = style([
  sprinkles({
    justifyContent: 'center',
    alignItems: 'center',
    paddingX: '16px',
    paddingBottom: '16px',
    overflow: 'hidden',
  }),
  style({
    display: 'grid',
    gridTemplateRows: `auto ${CONTROLS_HEIGHT}px`,
    gridTemplateColumns: '1fr',
    gridTemplateAreas: `
      'artwork'
      'controls'
    `,
    gap: `${CONTENT_GAP}px`,
    alignContent: 'center',
    justifyItems: 'center',
    maxHeight: '624px',
    height: '100%',
    width: '100%',
    selectors: {
      [`${horizontalLayout} &`]: {
        gridTemplateRows: `100%`,
        gridTemplateColumns: '1fr 1fr',
        gridTemplateAreas: `
          'artwork controls'
        `,
      },
    },
  }),
])

export const artwork = style([
  style({
    maxWidth: '320px',
    maxHeight: '320px',
    height: '100%',
    gridArea: 'artwork',
    '@media': {
      '(max-width: 200px)': {
        display: 'none',
      },
    },
  }),
])

export const controls = style({
  height: `${CONTROLS_HEIGHT}px`,
  maxWidth: `${PREFERRED_CONTROLS_WIDTH}px`,
  gridArea: 'controls',
  width: '100%',
  alignItems: 'center',
  display: 'grid',
  gridTemplateColumns: '1fr',
  gridTemplateRows: '56px 48px 72px 48px',
  gridTemplateAreas: `
    'info'
    'timeline'
    'controls'
    'sec-actions'
  `,
})

export const info = style({
  display: 'flex',
  gridArea: 'info',
  alignItems: 'center',
  overflow: 'hidden',
})

export const secondaryActions = style({
  gridArea: 'sec-actions',
  display: 'flex',
  justifyContent: 'space-between',
})

export const volumeMenuContent = sprinkles({
  paddingX: '16px',
})
