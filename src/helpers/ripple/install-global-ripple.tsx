import { animateEmpty } from '../animations/animations'
import { setStyles } from '../../utils'
import * as styles from './ripple.css'

interface RippleElement extends HTMLSpanElement {
  rippleCanExit: boolean
}

const FADE_DURATION = 200
const SCALE_DURATION = 500

export const installGlobalRipple = (targetclass: string) => {
  const activeRipples = new Set<RippleElement>()

  const markOrExitRipple = (ripple: RippleElement) => {
    if (ripple.rippleCanExit) {
      const fadeAni = ripple.animate(
        { opacity: 0 },
        {
          duration: FADE_DURATION,
          easing: 'linear',
        },
      )
      fadeAni.finished.then(() => {
        activeRipples.delete(ripple)
        ripple.remove()
      })
    } else {
      ripple.rippleCanExit = true
    }
  }

  const onPointerDownHandler = (e: PointerEvent) => {
    // Only respond to main click events.
    if (e.button !== 0) {
      return
    }

    const path = e.composedPath() as Element[]
    const target = path.find((el) => el.classList?.contains(targetclass))

    if (!target || target.hasAttribute('disabled')) {
      return
    }

    const rect = target.getBoundingClientRect()

    const ripple = document.createElement('span') as RippleElement
    ripple.className = styles.ripple
    ripple.rippleCanExit = false

    // Use small value and scale it up to the right size,
    // because that way less GPU memory is used
    // when container is very big.
    const realDiameter = styles.rippleDiameter
    const realRadius = realDiameter / 2

    const posX = e.clientX - rect.left
    const posY = e.clientY - rect.top

    setStyles(ripple, {
      top: `${posY - realRadius}px`,
      left: `${posX - realRadius}px`,
    })

    activeRipples.add(ripple)
    target.appendChild(ripple)

    // Find absolute distance from center of the click
    // to the edge of the container.
    const distanceToCX = Math.max(posX, rect.width - posX)
    const distanceToCY = Math.max(posY, rect.height - posY)
    const distanceC = Math.max(distanceToCX, distanceToCY)

    // Place square inside the container so it fills all available space,
    // then draw circle around it. This is basic idea of this calculation.
    const squareSide = distanceC * 2
    const diameter = Math.sqrt(squareSide ** 2 * 2)

    const scaleValue = diameter / realDiameter

    ripple.animate(
      { transform: ['scale(0)', `scale(${scaleValue})`] },
      {
        duration: SCALE_DURATION,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'both',
      },
    )

    animateEmpty(ripple, SCALE_DURATION - FADE_DURATION).finished.then(() =>
      markOrExitRipple(ripple),
    )
  }

  const onExitHandler = () => {
    if (!activeRipples.size) {
      return
    }
    activeRipples.forEach(markOrExitRipple)
  }

  // TODO: Maybe move these listeners to target element itself,
  // though need to be careful about race conditions.
  document.addEventListener('pointercancel', onExitHandler, true)
  document.addEventListener('pointerup', onExitHandler, true)

  document.addEventListener('pointerdown', onPointerDownHandler, true)
}
