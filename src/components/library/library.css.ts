import { style, composeStyles } from '@vanilla-extract/css'
import { sharedStyles, atoms, vars } from '../../styles/styles.css'

const mediumSnapPoint = '(max-width: 700px)'

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

export const navBtnSelected = style({})

const navBtnBase = style({
  height: '56px',
  width: '56px',
  lineHeight: '12px',
  fontSize: '12px',
  borderRadius: vars.static.radius.large,
  color: `hsla(${vars.colors.contentHsl}, 80%)`,
  position: 'relative',
  '@media': {
    [mediumSnapPoint]: {
      maxWidth: '70px',
      width: '100%',
      height: '100%',
      borderRadius: '33px',
      selectors: {
        [`${navBtnSelected}&::before`]: {
          top: 'auto',
        },
      },
    },
  },
  selectors: {
    [`${navBtnSelected}&`]: {
      // Isolate layer creation just to this element
      // when animation runs.
      zIndex: 1,
    },
    '&::before': {
      opacity: 0,
      transform: 'scaleX(.8)',
      content: '""',
      height: '28px',
      width: '54px',
      top: '6px',
      position: 'absolute',
      borderRadius: '14px',
      backgroundColor: `hsla(${vars.colors.primaryHsl}, 30%)`,
    },
    [`${navBtnSelected}&::before`]: {
      opacity: 1,
      transform: 'none',
      transition:
        'transform .4s cubic-bezier(0.0, 0.0, 0.2, 1), opacity .2s linear',
    },
  },
})

export const navBtn = composeStyles(
  sharedStyles.control,
  sharedStyles.flexColumn,
  navBtnBase,
  atoms({
    gap: 'small',
    justifyContent: 'center',
    alignItems: 'center',
  }),
)

export const navBtnTitle = style({
  '@media': {
    [mediumSnapPoint]: {
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
