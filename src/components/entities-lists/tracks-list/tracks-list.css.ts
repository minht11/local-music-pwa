import {
  style,
  composeStyles,
  createVar,
  globalStyle,
} from '@vanilla-extract/css'
import { virtualItem } from '../entities-list.css'
import { sharedStyles, atoms, vars } from '../../../styles/styles.css'

const mainColumnStartVar = createVar()
const mainColumnEndVar = createVar()
const timeAreaVar = createVar()
const menuAreaVar = createVar()

const supportsHoverMedia = '(hover: hover)'
const mediumWidthMedia = '(max-width: 800px)'
const smallWidthMedia = '(max-width: 440px)'
const extraSmallWidthMedia = '(max-width: 256px)'

const trackListItemBase = style({
  vars: {
    [mainColumnStartVar]: 'main',
    [mainColumnEndVar]: 'main',
    [timeAreaVar]: 'last-1',
    [menuAreaVar]: 'last-0',
  },
  display: 'grid',
  gridTemplateRows: '1fr 1fr',
  gridTemplateColumns: 'auto 2fr 1fr 44px 44px',
  gridTemplateAreas: `
    'first main album last-1 last-0'
    'first main album last-1 last-0'
  `,
  columnGap: vars.static.gap.medium,
  justifyContent: 'space-around',
  padding: `0 ${vars.static.gap.medium} 0 ${vars.static.gap.large}`,
  color: vars.colors.content2,
  alignContent: 'center',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  '@media': {
    [supportsHoverMedia]: {
      vars: {
        [timeAreaVar]: 'last-0',
        [menuAreaVar]: 'last-1',
      },
    },
    [mediumWidthMedia]: {
      vars: {
        [mainColumnEndVar]: 'album',
      },
    },
    [smallWidthMedia]: {
      vars: {
        [mainColumnEndVar]: 'last-1',
        [menuAreaVar]: 'last-0',
      },
    },
    [extraSmallWidthMedia]: {
      vars: {
        [mainColumnStartVar]: 'first',
      },
    },
  },
})

globalStyle(`${trackListItemBase} > *:not(button)`, {
  pointerEvents: 'none',
})

export const trackListItem = composeStyles(
  virtualItem,
  atoms({
    typography: 'body2',
    radius: 'large',
  }),
  sharedStyles.listItem,
  trackListItemBase,
)

const primaryColorOpacity = (opacity: string) =>
  `hsla(${vars.colors.primaryHsl}, ${opacity})`

export const active = style({
  background: primaryColorOpacity('10%'),
  selectors: {
    '&:hover': {
      background: primaryColorOpacity('15%'),
    },
    '&:focus-visible': {
      background: primaryColorOpacity('20%'),
    },
    '&:hover:focus-visible': {
      background: primaryColorOpacity('25%'),
    },
  },
})

export const firstColumn = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '24px',
  marginRight: vars.static.gap.large,
  gridArea: 'first',
})

export const artwork = composeStyles(
  atoms({
    marginRight: 'medium',
    radius: 'medium',
  }),
  style({
    height: '36px',
    width: '36px',
    contain: 'strict',
    selectors: {
      [`${active} &`]: {
        border: `2px solid ${vars.colors.primary}`,
      },
    },
    '@media': {
      [extraSmallWidthMedia]: {
        display: 'none',
      },
    },
  }),
)

const textEclipse = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
})

export const mainColumn = style({
  gridColumnStart: mainColumnStartVar,
  gridColumnEnd: mainColumnEndVar,
})

const titleBase = style({
  gridRow: 1,
  alignSelf: 'end',
  color: vars.colors.content1,
})

export const title = composeStyles(
  atoms({
    typography: 'body1',
  }),
  textEclipse,
  mainColumn,
  titleBase,
)

globalStyle(`${active} :is(${firstColumn}, ${titleBase})`, {
  color: vars.colors.primary,
})

export const artist = composeStyles(
  mainColumn,
  textEclipse,
  style({
    gridRow: 2,
    alignSelf: 'start',
  }),
)

const albumBase = style({
  gridArea: 'album',
  '@media': {
    [mediumWidthMedia]: {
      background: 'red',
      display: 'none',
    },
  },
})

export const album = composeStyles(textEclipse, albumBase)

const timeBase = style({
  gridArea: timeAreaVar,
  '@media': {
    [smallWidthMedia]: {
      display: 'none',
    },
  },
})

export const time = composeStyles(textEclipse, timeBase)

const menuBase = style({
  gridArea: menuAreaVar,
  '@media': {
    [supportsHoverMedia]: {
      // In order for focus returning to work correctly when menu is closed
      // we can't use display: none or visibility: hidden.
      // Furthermore opacity: 0 or clip-path causes compositng issues
      // at least in Chrome, so to hide element use width: 0 instead.
      width: 0,
      selectors: {
        [`${trackListItemBase}:focus-within &,
          ${trackListItemBase}:hover &`]: {
          width: 'revert',
        },
      },
    },
  },
})

export const menu = composeStyles(textEclipse, menuBase)
