import { style, composeStyles } from '@vanilla-extract/css'
import { sharedStyles, atoms } from '../../styles/styles.css'

export const { pageContainer } = sharedStyles

export const section = composeStyles(
  atoms({
    display: 'flex',
    flexDirection: 'column',
    surface: 'surface2',
    radius: 'veryLarge',
    alignItems: 'center',
    gap: 'medium',
  }),
  style({
    width: '100%',
    maxWidth: '460px',
    margin: 'auto',
    textAlign: 'center',
    padding: `48px 16px`,
  }),
)

export const logo = style({
  height: '96px',
  width: '96px',
})

export const title = atoms({
  typography: 'headline3',
  color: 'content1',
})
