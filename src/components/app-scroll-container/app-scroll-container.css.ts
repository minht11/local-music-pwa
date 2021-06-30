import { style, composeStyles } from '@vanilla-extract/css'
import { sharedStyles, atoms } from '../../styles/styles.css'

export const container = composeStyles(
  sharedStyles.flexColumn,
  style({
    width: '100%',
  }),
)

export const scrollContainer = composeStyles(
  sharedStyles.scrollContainer,
  atoms({
    display: 'flex',
    flexDirection: 'column',
    rowGap: 'large',
    paddingY: 'large',
    paddingX: 'medium',
  }),
  style({
    width: '100%',
    height: '100%',
  }),
)
