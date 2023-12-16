import { animateEmpty } from '../helpers/animations'

const FADE_DURATION = 200
const SCALE_DURATION = 500

const rippleSpan = document.createElement('span')
const activeRipples = new Map<HTMLSpanElement, boolean>()

let resolvers: undefined | ReturnType<typeof Promise.withResolvers>

export const pendingRipples = async () => {
	await resolvers?.promise
}

const markForOrExitRipple = (ripple: HTMLSpanElement) => {
	const canExit = activeRipples.get(ripple)

	if (canExit) {
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

			if (!activeRipples.size) {
				resolvers?.resolve()
			}
		})
	} else {
		activeRipples.set(ripple, true)
	}
}

const onExitHandler = () => {
	if (!activeRipples.size) {
		return
	}

	for (const ripple of activeRipples.keys()) {
		markForOrExitRipple(ripple)
	}
}

document.addEventListener('pointercancel', onExitHandler)
document.addEventListener('pointerup', onExitHandler)

const onPointerDownHandler = (e: PointerEvent) => {
	// Only respond to main click events.
	if (e.button !== 0) {
		return
	}

	const node = e.currentTarget as HTMLElement

	if (node.hasAttribute('disabled')) {
		return
	}

	const rect = node.getBoundingClientRect()

	const ripple = rippleSpan.cloneNode() as HTMLSpanElement
	ripple.className = 'ripple'

	resolvers = Promise.withResolvers()

	// Use small value and scale it up to the right size,
	// because that way less GPU memory is used
	// when container is very big.
	const realDiameter = 4
	const realRadius = realDiameter / 2

	const posX = e.clientX - rect.left
	const posY = e.clientY - rect.top

	Object.assign(ripple.style, {
		top: `${posY - realRadius}px`,
		left: `${posX - realRadius}px`,
	})

	activeRipples.set(ripple, false)
	node.appendChild(ripple)

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
		markForOrExitRipple(ripple),
	)
}

export const ripple = (node: HTMLElement) => {
	node.addEventListener('pointerdown', onPointerDownHandler)

	return {
		destroy() {
			node.removeEventListener('pointerdown', onPointerDownHandler)
		},
	}
}
