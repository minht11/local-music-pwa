import {
  style,
  composeStyles,
  createVar,
  globalStyle,
} from '@vanilla-extract/css'
import { virtualItem } from '../entities-list.css'
import { sharedStyles, atoms, vars } from '../../../styles/styles.css'

export const INFO_CONTAINER_HEIGHT = 56
const SCROLLBAR_SIZE_WORST_CASE = 18

const stripScrollBarColor = createVar()

const sContainer = style({
  vars: {
    [stripScrollBarColor]: 'transparent',
  },
  height: `${180 + INFO_CONTAINER_HEIGHT + SCROLLBAR_SIZE_WORST_CASE}px`,
  width: '100%',
  display: 'flex',
  scrollbarColor: `${stripScrollBarColor} transparent`,
  selectors: {
    '&::-webkit-scrollbar-thumb': {
      background: stripScrollBarColor,
    },
    '&::-webkit-scrollbar': {
      background: 'transparent',
      height: '4px',
    },
    '&:is(:focus-within, :hover)': {
      [stripScrollBarColor]: vars.colors.scrollBar,
    },
  },
})

export const scrollContainer = composeStyles(
  sharedStyles.scrollContainer,
  sContainer,
)

export const gridItem = composeStyles(
  sharedStyles.control,
  virtualItem,
  atoms({
    radius: 'veryLarge',
    padding: 'medium',
  }),
  style({
    paddingBottom: 0,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  }),
)

export const round = style({
  overflow: 'hidden',
  borderRadius: '50%',
})

export const artwork = composeStyles(
  atoms({
    radius: 'large',
  }),
  style({
    width: '100%',
  }),
)

const infoContainerBase = style({
  height: INFO_CONTAINER_HEIGHT,
  whiteSpace: 'nowrap',
})

export const infoContainer = composeStyles(
  atoms({
    typography: 'body2',
    color: 'content2',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  }),
  infoContainerBase,
  style({
    overflow: 'hidden',
    textAlign: 'center',
  }),
)

globalStyle(`${infoContainerBase} > *`, {
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  width: '100%',
})

export const title = atoms({
  typography: 'body1',
  color: 'content1',
})
