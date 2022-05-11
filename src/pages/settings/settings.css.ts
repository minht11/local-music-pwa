import { style } from '@vanilla-extract/css'
import { sharedStyles, vars, sprinkles } from '../../styles/styles.css'

export const section = style([
  sprinkles({
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
  }),
  style({
    margin: '0 auto',
    width: '100%',
    maxWidth: '900px',
  }),
])

export const subheader = sprinkles({
  typography: 'titleSmall',
  color: 'onSurfaceVariant',
  paddingBottom: '16px',
})

export const smallSettingsItem = style([
  sprinkles({
    typography: 'bodyLarge',
    display: 'flex',
    justifyContent: 'space-between',
  }),
  style({
    height: '24px',
  }),
])

export const tracksInfoPanel = style([
  section,
  sprinkles({
    tonalElevation: 1,
    radius: '8px',
    display: 'flex',
    gap: '16px',
  }),
])

export const tracksInfoText = sprinkles({
  typography: 'bodyLarge',
})

export const countText = sprinkles({
  color: 'onTertiary',
  surface: 'tertiary',
  radius: '12px',
  paddingX: '8px',
})

export const tracksInfoCaption = style([
  sprinkles({
    typography: 'bodyMedium',
  }),
  style({
    margin: 'none',
  }),
])

export const tracksWarnLegacyMessage = style([
  sprinkles({
    userSelect: 'text',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '16px',
    radius: '8px',
  }),
  style({
    border: `1px solid ${vars.colors.outline}`,
  }),
])

export const trackPanelActions = style([
  sharedStyles.actions,
  style({
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  }),
])
