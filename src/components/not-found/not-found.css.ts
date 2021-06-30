import { style, composeStyles } from '@vanilla-extract/css'
import { sharedStyles, atoms } from '../../styles/styles.css'

export const notFound = composeStyles(
  sharedStyles.pageContainer,
  atoms({
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 'veryLarge',
    padding: 'large',
  }),
  style({
    textAlign: 'center',
  }),
)

export const title = atoms({
  typography: 'headline2',
})

export const button = sharedStyles.button.pill.regular
