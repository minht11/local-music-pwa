import { style, composeStyles, globalStyle } from '@vanilla-extract/css'
import { atoms } from '../../../../styles/styles.css'

export const infoContainer = composeStyles(
  atoms({
    display: 'flex',
    alignItems: 'center',
    gap: 'medium',
  }),
  style({
    gridArea: 'info',
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
    flex: 'auto 1',
  }),
)

const infoBase = style({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  overflow: 'hidden',
  userSelect: 'text',
  whiteSpace: 'nowrap',
})

globalStyle(`${infoBase} > *`, {
  textOverflow: 'ellipsis',
  overflow: 'hidden',
})

export const info = composeStyles(
  atoms({
    typography: 'headline2',
  }),
  infoBase,
)

export const titleRegular = atoms({
  typography: 'body2',
})

export const titleBig = atoms({
  typography: 'headline2',
})

export const secondaryInfoText = atoms({
  color: 'content2',
  typography: 'body2',
})

export const infoFavoriteBtn = style({
  marginLeft: 'auto',
})
