import { style, composeStyles, createVar } from '@vanilla-extract/css'
import { sharedStyles, atoms, vars } from '../../../styles/styles.css'

export const fpContainer = style({
  width: '100%',
  height: '100%',
  display: 'flex',
  contain: 'strict',
})

export const CONTENT_GAP = 24
export const CONTROLS_HEIGHT = 224
export const PREFERRED_CONTROLS_WIDTH = 320

export const artworkSizeVar = createVar()

export const controlsPane = composeStyles(
  atoms({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'medium',
  }),
  style({
    width: '100%',
    maxWidth: `${PREFERRED_CONTROLS_WIDTH}px`,
    padding: '0 16px 16px',
  }),
)

export const compactControls = style({
  maxWidth: '100%',
})

export const controlsHeader = composeStyles(
  sharedStyles.actions,
  style({
    justifyContent: 'space-between',
    width: '100%',
    height: vars.sizes.toolbarHeight,
    flexShrink: 0,
  }),
)

export const title = atoms({
  typography: 'headline1',
})

export const toolbarSpacer = style({
  maxWidth: '44px',
  flex: 'auto 1 0',
})

export const content = composeStyles(
  atoms({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  }),
  style({
    gap: `${CONTENT_GAP}px`,
    alignContent: 'center',
    flexWrap: 'wrap',
    overflow: 'hidden',
    maxHeight: '724px',
    height: '100%',
    width: '100%',
  }),
)

export const artwork = composeStyles(
  atoms({
    radius: 'veryLarge',
  }),
  style({
    width: artworkSizeVar,
    height: artworkSizeVar,
    '@media': {
      '(max-width: 200px)': {
        display: 'none',
      },
    },
  }),
)

export const controls = style({
  height: `${CONTROLS_HEIGHT}px`,
  minWidth: artworkSizeVar,
  maxWidth: `${PREFERRED_CONTROLS_WIDTH}px`,
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

export const secondaryActions = style({
  gridArea: 'sec-actions',
  display: 'flex',
  justifyContent: 'space-between',
})

export const volumeMenuContent = atoms({
  paddingLeft: 'large',
})

export const queuePaneFill = style({
  width: '100%',
  height: '100%',
  position: 'absolute',
})

export const queueHeader = style({
  background: `hsla(${vars.colors.contentHsl}, 5%)`,
})
