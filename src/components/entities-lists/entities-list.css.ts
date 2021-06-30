import { style, composeStyles } from '@vanilla-extract/css'
import { sharedStyles, atoms, vars } from '../../styles/styles.css'

export const subheader = composeStyles(
  sharedStyles.actions,
  style({
    justifyContent: 'center',
    padding: `0px ${vars.static.gap.medium} 0px ${vars.static.gap.large}`,
    height: '48px',
  }),
)

export const heading = composeStyles(
  atoms({
    typography: 'body2',
    color: 'content2',
  }),
  style({
    marginRight: 'auto',
  }),
)

export const entitiesListSection = composeStyles(
  atoms({
    display: 'flex',
    flexDirection: 'column',
    border: 'small',
    radius: 'veryLarge',
    padding: 'medium',
  }),
  style({
    flexShrink: 0,
  }),
)

export const virtualItem = style({
  position: 'absolute',
  contain: 'strict',
  width: '100%',
  top: 0,
  left: 0,
  // TODO. Need more testing to understand if increased
  // layer memory is worth the benefit of potential performance.
  // So far enabling this doesn't have any perceivable improvement.
  // willChange: 'transform',
})
