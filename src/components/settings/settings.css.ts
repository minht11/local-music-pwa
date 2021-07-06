import { style, composeStyles } from '@vanilla-extract/css'
import { sharedStyles, atoms } from '../../styles/styles.css'

export const { pageContainer } = sharedStyles

export const section = composeStyles(
  atoms({
    display: 'flex',
    flexDirection: 'column',
    padding: 'large',
  }),
  style({
    margin: '0 auto',
    width: '100%',
    maxWidth: '900px',
  }),
)

export const subheader = atoms({
  typography: 'subheader',
  color: 'content2',
  paddingBottom: 'large',
})

export const smallSettingsItem = composeStyles(
  atoms({
    typography: 'body1',
    display: 'flex',
    justifyContent: 'space-between',
  }),
  style({
    height: '24px',
  }),
)

export const tracksInfoPanel = composeStyles(
  section,
  atoms({
    surface: 'surface2',
    radius: 'large',
    display: 'flex',
    gap: 'large',
  }),
)

export const tracksInfoText = atoms({
  typography: 'body1',
})

export const primaryText = atoms({
  color: 'primary',
})

export const tracksInfoCaption = atoms({
  typography: 'body2',
  color: 'content2',
  margin: 'none',
})

export const tracksWarnLegacyMessage = atoms({
  userSelect: 'text',
  display: 'flex',
  padding: 'large',
  border: 'small',
  radius: 'large',
  color: 'content2',
})

export const trackPanelActions = composeStyles(
  sharedStyles.actions,
  style({
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  }),
)
