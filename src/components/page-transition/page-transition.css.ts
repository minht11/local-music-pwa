import { style } from '@vanilla-extract/css'
import { createFromToKeyframes } from '../../styles/css-helpers'
import {
  EASING_INCOMING_80,
  EASING_INCOMING_80_OUTGOING_40,
  EASING_OUTGOING_40,
  fadeInAni,
  fadeOutAni,
} from '../../styles/shared.css'

const [enterForwardsAni, exitBackwardsAni] = createFromToKeyframes({
  transform: 'scale(.8, .8)',
})

const [enterBackwardsAni, exitForwardsAni] = createFromToKeyframes({
  transform: 'scale(1.1, 1.1)',
})

const createEnterStyle = (aniName: string) =>
  style({
    pointerEvents: 'none',
    animation: `
      ${fadeInAni} 210ms 90ms backwards ${EASING_INCOMING_80},
      ${aniName} 300ms ${EASING_INCOMING_80_OUTGOING_40}
    `,
  })

const createExitStyle = (aniName: string) =>
  style({
    pointerEvents: 'none',
    animation: `
      ${fadeOutAni} 90ms forwards ${EASING_OUTGOING_40},
      ${aniName} 300ms ${EASING_INCOMING_80_OUTGOING_40}
    `,
  })

export const enterForwards = createEnterStyle(enterForwardsAni)
export const enterBackwards = createEnterStyle(enterBackwardsAni)

export const exitBackwards = createExitStyle(exitBackwardsAni)
export const exitForwards = createExitStyle(exitForwardsAni)
