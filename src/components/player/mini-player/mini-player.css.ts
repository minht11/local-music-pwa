import { style, composeStyles } from '@vanilla-extract/css'
import { miniPlayerHeightVar } from '../player.css'
import { sharedStyles, atoms, vars } from '../../../styles/styles.css'

const smallMedia = '(max-width: 700px), (max-height: 400px)'

export const container = composeStyles(
  atoms({
    columnGap: 'large',
    rowGap: 'medium',
  }),
  style({
    contain: 'strict',
    display: 'grid',
    position: 'absolute',
    top: 0,
    height: miniPlayerHeightVar,
    width: '100%',
    alignItems: 'center',
    padding: `${vars.static.padding.medium} ${vars.static.padding.large}`,
    gridTemplateRows: 'min-content auto',
    gridTemplateColumns: 'auto 1fr auto 1fr',
    gridTemplateAreas: `'timeline timeline timeline timeline'
      'artwork info controls sec-controls'`,
    '@media': {
      [smallMedia]: {
        paddingTop: 0,
        columnGap: vars.static.gap.medium,
        gridTemplateRows: 'min-content auto',
        gridTemplateColumns: 'auto 1fr auto',
        gridTemplateAreas: `
          'timeline timeline timeline'
          'artwork info sec-controls'
        `,
      },
    },
  }),
)

export const secondaryControls = composeStyles(
  sharedStyles.actions,
  style({
    gridArea: 'sec-controls',
    justifyContent: 'flex-end',
  }),
)

export const artwork = composeStyles(
  atoms({
    radius: 'medium',
  }),
  style({
    gridArea: 'artwork',
    height: '40px',
    width: '40px',
    '@media': {
      [smallMedia]: {
        marginRight: vars.static.padding.medium,
      },
    },
  }),
)

export const fixedWidthInfo = style({
  maxWidth: '320px',
})
