import { animateFade } from './animations'

export const EASING_INCOMING_80_OUTGOING_40 = 'cubic-bezier(0.4, 0.0, 0.2, 1)'
export const EASING_INCOMING_80 = 'cubic-bezier(0, 0, .2, 1)'
export const EASING_OUTGOING_40 = 'cubic-bezier(.4, 0, 1, 1)'

const animateViewEnter = (element: Element, transformKeyframe: string) => {
  animateFade(element, false, {
    delay: 90,
    duration: 210,
    easing: EASING_INCOMING_80,
    fill: 'backwards',
  })

  return element.animate(
    {
      transform: [transformKeyframe, 'none'],
    },
    {
      duration: 300,
      easing: EASING_INCOMING_80_OUTGOING_40,
    },
  ).finished
}

export const animateViewEnterForwards = (element: Element) =>
  animateViewEnter(element, 'scale(.8, .8)')

export const animateViewEnterBackwards = (element: Element) =>
  animateViewEnter(element, 'scale(1.1, 1.1)')

const animateViewExit = (element: Element, transformKeyframe: string) => {
  element.animate(
    {
      transform: ['none', transformKeyframe],
    },
    {
      duration: 300,
      easing: EASING_INCOMING_80_OUTGOING_40,
    },
  )

  // Once element is invisible it should removed so there is
  // no point on waiting for transform animation to finish.
  return animateFade(element, true, {
    duration: 90,
    easing: EASING_OUTGOING_40,
  }).finished
}

export const animateViewExitForwards = (element: Element) =>
  animateViewExit(element, 'scale(1.1, 1.1)')

export const animateViewExitBackwards = (element: Element) =>
  animateViewExit(element, 'scale(.8, .8)')
