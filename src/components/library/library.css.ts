import { style, composeStyles } from '@vanilla-extract/css'
import { sharedStyles, atoms, vars } from '../../styles/styles.css'

const mediumSnapPoint = '(max-width: 700px)'
const smallSnapPoint = '(max-width: 400px)'
const extraSmallSnapPoint = '(max-width: 268px)'

export const pageContainer = composeStyles(
  sharedStyles.pageContainer,
  style({
    display: 'grid',
    gridTemplateColumns: '72px 1fr',
    gridTemplateRows: 'auto 1fr',
    gridTemplateAreas: `
      'toolbar toolbar'
      'nav content'
    `,
    '@media': {
      [mediumSnapPoint]: {
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'auto 48px 1fr',
        gridTemplateAreas: `
          'toolbar'
          'nav'
          'content'
        `,
      },
    },
  }),
)

export const navRail = composeStyles(
  sharedStyles.flexColumn,
  style({
    alignItems: 'center',
    padding: `${vars.static.gap.large} 0`,
    gap: vars.static.gap.medium,
    gridArea: 'nav',
    '@media': {
      [mediumSnapPoint]: {
        flexDirection: 'row',
        padding: `${vars.static.gap.small} ${vars.static.gap.large}`,
        background: vars.colors.surface1,
      },
    },
  }),
)

const navBtnBase = style({
  height: '56px',
  width: '56px',
  lineHeight: '12px',
  fontSize: '12px',
  '@media': {
    [mediumSnapPoint]: {
      flexDirection: 'row',
      width: '100%',
      height: '100%',
      maxWidth: '104px',
    },
    [extraSmallSnapPoint]: {
      margin: 0,
      padding: 0,
    },
  },
})

export const navBtn = composeStyles(
  sharedStyles.control,
  sharedStyles.flexColumn,
  navBtnBase,
  atoms({
    radius: 'large',
    color: 'content2',
    gap: 'medium',
    justifyContent: 'center',
    alignItems: 'center',
  }),
)

export const navBtnSelected = style({
  color: vars.colors.primary,
})

export const navBtnTitle = style({
  '@media': {
    [smallSnapPoint]: {
      display: 'none',
    },
  },
})

export const libraryPageContainer = composeStyles(
  sharedStyles.scrollContainer,
  style({
    position: 'relative',
    gridArea: 'content',
    contain: 'strict',
    margin: '0 auto',
    overflow: 'auto',
    width: '100%',
    padding: `${vars.static.gap.large} ${vars.static.gap.medium}`,
    transformOrigin: '50% 50vh',
  }),
)

export const installButton = sharedStyles.button.pill.regular
