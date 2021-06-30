import { style, composeStyles } from '@vanilla-extract/css'
import { sharedStyles, atoms, vars } from '../../styles/styles.css'

export const page = sharedStyles.pageContainer

export const scrollContainer = composeStyles(sharedStyles.pageContainer)

export const infoHeader = composeStyles(
  atoms({
    typography: 'body2',
    color: 'content2',
    columnGap: 'large',
    rowGap: 'medium',
    radius: 'veryLarge',
    marginY: 'large',
  }),
  style({
    height: '128px',
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    gridTemplateAreas: `
      'artwork info actions'
    `,
    '@media': {
      '(max-width: 600px)': {
        gridTemplateColumns: 'auto 1fr',
        gridTemplateRows: '1fr auto',
        gridTemplateAreas: `
          'artwork info'
          'artwork actions'
        `,
      },
      '(max-width: 400px)': {
        gap: vars.static.gap.large,
        textAlign: 'center',
        height: 'auto',
        justifyItems: 'center',
        gridTemplateColumns: '1fr',
        gridTemplateRows: '80vmin auto auto',
        gridTemplateAreas: `
          'artwork'
          'info'
          'actions'
        `,
      },
    },
  }),
)

export const artwork = composeStyles(
  atoms({
    radius: 'veryLarge',
  }),
  style({
    height: '100%',
    margin: 'auto',
    gridArea: 'artwork',
  }),
)

export const details = style({
  gridArea: 'info',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  width: '100%',
})

export const singleLineBase = style({
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
})

export const singleLine = composeStyles(
  atoms({
    color: 'content2',
  }),
  singleLineBase,
)

export const title = composeStyles(
  singleLineBase,
  atoms({
    typography: 'headline2',
    color: 'content1',
  }),
)

export const actions = composeStyles(
  atoms({
    color: 'content1',
  }),
  sharedStyles.actions,
  style({
    height: 'fit-content',
  }),
)

export const playButton = composeStyles(
  sharedStyles.button.pill.primary,
  style({
    paddingRight: '8px',
    width: 'auto',
  }),
)
