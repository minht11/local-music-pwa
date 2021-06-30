import { toggleReverseArray } from '../../utils'

export const animateFade = (
  element: Element,
  fadeOut: boolean,
  options: KeyframeAnimationOptions,
) => element.animate(
    {
      opacity: toggleReverseArray([0, 1], fadeOut),
    },
    options,
  ).finished
