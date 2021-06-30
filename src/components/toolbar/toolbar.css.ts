import { style, composeStyles } from '@vanilla-extract/css'
import { sharedStyles, atoms, vars } from '../../styles/styles.css'

export const toolbar = composeStyles(
  sharedStyles.actions,
  style({
    width: '100%',
    height: vars.sizes.toolbarHeight,
    padding: '0 8px 0 16px',
    flexShrink: 0,
    gridArea: 'toolbar',
    background: vars.colors.surface1,
  }),
)

export const title = atoms({
  typography: 'headline1',
})

export const spacer = style({
  flex: 1,
})
