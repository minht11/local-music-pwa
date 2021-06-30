import { style, composeStyles } from '@vanilla-extract/css'
import { sharedStyles, atoms } from '../../styles/styles.css'

export const title = atoms({
  typography: 'headline2',
  color: 'content1',
})

export const button = sharedStyles.button.pill.regular

export const messageBanner = composeStyles(
  atoms({
    display: 'flex',
    flexDirection: 'column',
    color: 'content2',
    rowGap: 'medium',
    justifyContent: 'center',
    alignItems: 'center',
  }),
  style({
    textAlign: 'center',
    margin: 'auto',
  }),
)
