import { style, keyframes } from '@vanilla-extract/css'
import { EASING_INCOMING_80, EASING_OUTGOING_40 } from '~/styles/shared.css'
import { sharedStyles, sprinkles, vars } from '~/styles/styles.css'

export const { tonalButton, filledButton, outlinedButton } = sharedStyles

export const navTabs = style({
  display: 'flex',
})

export const navRail = style([
  sharedStyles.flexColumn,
  style({
    width: '80px',
    padding: '16px 0',
    gridArea: 'nav',
  }),
])

export const navBottomBar = style({
  display: 'flex',
  height: '64px',
})

export const elavated = sprinkles({
  tonalElevation: 2,
})

export const navBtnSelected = style({})

const navBtnBase = style({
  height: '56px',
  width: '100%',
  lineHeight: '12px',
  fontSize: '12px',
  fontWeight: 500,
  color: vars.colors.onSurfaceVariant,
  selectors: {
    '&::before': {
      zIndex: -1,
      opacity: 0,
      transform: 'scaleX(.8)',
      content: '""',
      height: '32px',
      width: '58px',
      position: 'absolute',
      borderRadius: '32px',
      backgroundColor: vars.colors.secondaryContainer,
    },
    [`${navTabs} &::before`]: {
      display: 'none',
    },
    [`${navTabs} &`]: {
      border: `2px solid transparent`,
    },
    [`${navTabs} ${navBtnSelected}&`]: {
      borderBottomColor: `currentColor`,
    },
    [`${navBtnSelected}&::before`]: {
      opacity: 1,
      transform: 'none',
      transition:
        'transform .4s cubic-bezier(0.0, 0.0, 0.2, 1), opacity .2s linear',
    },
    [`${navBtnSelected}&`]: {
      color: vars.colors.onSecondaryContainer,
    },
    [`${navBottomBar} &`]: {
      height: '100%',
    },
  },
})

export const navBtn = style([
  sharedStyles.interactable,
  sharedStyles.flexColumn,
  navBtnBase,
  sprinkles({
    gap: '4px',
    justifyContent: 'center',
    alignItems: 'center',
  }),
])

export const content = style({
  display: 'grid',
  width: '100%',
  height: '100%',
})

export const libraryPageContainer = style({
  transformOrigin: '50% 50vh',
  gridArea: '1 / 1',
})

const enterPageAni = keyframes({
  from: {
    transform: 'scale(.92, .92)',
    opacity: 0,
  },
})

export const enterPage = style({
  pointerEvents: 'none',
  animation: `${enterPageAni} 210ms 90ms ${EASING_INCOMING_80} backwards`,
})

export const exitPage = style({
  pointerEvents: 'none',
  animation: `${sharedStyles.fadeOutAni} 90ms ${EASING_OUTGOING_40} forwards`,
})

export const actions = style([
  sharedStyles.actions,
  style({ justifyContent: 'flex-end' }),
])
