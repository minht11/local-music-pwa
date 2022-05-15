import {
  TransitionGroup,
  animateMove,
  cssEnter,
  cssExit,
} from '@otonashixav/solid-flip'
import { ParentComponent, Show } from 'solid-js'
import { usePrefersReducedMotion } from '~/utils'

export interface CSSTransitionProps {
  enter: string
  exit: string
  move?: boolean
  initial?: boolean
}

export const CSSTransition: ParentComponent<CSSTransitionProps> = (props) => {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <Show when={!prefersReducedMotion()} fallback={props.children}>
      <TransitionGroup
        initial={props.initial}
        enter={cssEnter({
          active: props.enter,
        })}
        exit={cssExit({
          active: props.exit,
        })}
        move={
          (props.move &&
            animateMove({
              keyframes: (_, x, y) => ({
                transform: [`translate(${x}px,${y}px)`, 'none'],
              }),
              options: { duration: 100, easing: 'ease', fill: 'backwards' },
            })) ||
          undefined
        }
      >
        {props.children}
      </TransitionGroup>
    </Show>
  )
}
