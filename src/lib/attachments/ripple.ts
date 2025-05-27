import { assign } from '$lib/helpers/utils/assign.ts'
import type { Attachment } from 'svelte/attachments'
import { on } from 'svelte/events'
import { animateEmpty } from '../helpers/animations.ts'

const FADE_DURATION = 180
const SCALE_DURATION = 400

const rippleSpan = import.meta.env.SSR
	? (null as unknown as HTMLSpanElement)
	: document.createElement('span')
const activeRipples = new Map<HTMLSpanElement, boolean>()

/** @public */
export const getActiveRipplesCount = (): number => activeRipples.size

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

if (!import.meta.env.SSR) {
	document.addEventListener('pointercancel', onExitHandler)
	document.addEventListener('pointerup', onExitHandler)
}

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

	// Use small value and scale it up to the right size,
	// because that way less GPU memory is used
	// when container is very big.
	const realDiameter = 4
	const realRadius = realDiameter / 2

	const posX = e.clientX - rect.left
	const posY = e.clientY - rect.top

	assign(ripple.style, {
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

export interface RippleOptions {
	stopPropagation?: boolean
}

export const ripple = (options: RippleOptions = {}): Attachment<HTMLElement> => {
	return (node) => {
		const cleanup = on(node, 'pointerdown', (e) => {
			if (options?.stopPropagation) {
				e.stopPropagation()
			}

			onPointerDownHandler(e)
		})
		return cleanup
	}
}
