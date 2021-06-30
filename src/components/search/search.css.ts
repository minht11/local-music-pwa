import { style, composeStyles } from '@vanilla-extract/css'
import { sharedStyles, atoms, vars } from '../../styles/styles.css'

export const page = composeStyles(
  sharedStyles.pageContainer,
  style({
    display: 'grid',
    gridTemplateRows: 'auto 1fr',
    gridTemplateAreas: `
      'toolbar'
      'results'
    `,
  }),
)

export const resulsTitle = composeStyles(
  atoms({
    typography: 'headline1',
    paddingY: 'medium',
  }),
  style({
    marginLeft: `calc(${vars.static.gap.large} + ${vars.static.gap.medium})`,
    selectors: {
      '&:first-letter': {
        textTransform: 'capitalize',
      },
    },
  }),
)

export const resultsContainer = composeStyles(
  sharedStyles.scrollContainer,
  atoms({
    paddingY: 'large',
    paddingX: 'medium',
    gap: 'large',
    display: 'flex',
    flexDirection: 'column',
  }),
  style({
    gridArea: 'results',
    height: '100%',
  }),
)
