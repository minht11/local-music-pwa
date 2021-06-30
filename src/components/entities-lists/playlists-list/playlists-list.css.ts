import { style, composeStyles } from '@vanilla-extract/css'
import { virtualItem } from '../entities-list.css'
import { sharedStyles, atoms, vars } from '../../../styles/styles.css'

const playlistItemBase = style({
  display: 'grid',
  gridTemplateRows: '1fr',
  gridTemplateColumns: '24px 1fr 44px',
})

export const playlistItem = composeStyles(
  virtualItem,
  atoms({
    typography: 'body1',
    gap: 'medium',
    paddingLeft: 'large',
    paddingRight: 'medium',
    color: 'content2',
    radius: 'large',
  }),
  sharedStyles.listItem,
  playlistItemBase,
)

export const selected = style({
  color: vars.colors.primary,
})

export const name = composeStyles(
  atoms({
    color: 'content1',
    paddingLeft: 'large',
  }),
  style({
    selectors: {
      [`${selected} &`]: {
        color: vars.colors.primary,
      },
    },
  }),
)

export const menu = style({
  '@media': {
    '(hover: hover)': {
      // See reason for using width: 0 in tracks-list.css.ts file.
      width: 0,
      selectors: {
        [`${playlistItemBase}:focus-within &,
          ${playlistItemBase}:hover &`]: {
          width: 'revert',
        },
      },
    },
  },
})
