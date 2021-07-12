import { toggleReverseArray } from '../../utils'

export const animateFade = (
  element: Element,
  fadeOut: boolean,
  options: KeyframeAnimationOptions,
): Animation =>
  element.animate(
    {
      opacity: toggleReverseArray([0, 1], fadeOut),
    },
    options,
  )

export const animateEmpty = (element: Element, duration: number) =>
  element.animate(null, {
    duration,
  })
