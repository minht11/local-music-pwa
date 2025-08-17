import { autoPlacement, autoUpdate, computePosition, offset } from '@floating-ui/dom'
import type { Attachment } from 'svelte/attachments'
import { on } from 'svelte/events'

let tooltipTemplate: HTMLDivElement | null = null
const getTooltipTemplate = () => {
	if (tooltipTemplate === null) {
		tooltipTemplate = document.createElement('div')
		tooltipTemplate.setAttribute('role', 'tooltip')
		tooltipTemplate.className =
			'tooltip-enter bg-inverseSurface max-w-80 flex items-center inset-0 m-0 text-body-sm min-h-6 text-inverseOnSurface px-2 py-0.5 rounded-sm'
		tooltipTemplate.popover = 'manual'
	}

	return tooltipTemplate.cloneNode() as HTMLDivElement
}

export const tooltip = (message: string | undefined): Attachment<HTMLElement> => {
	return (target) => {
		if (!message || import.meta.env.SSR) {
			return
		}

		const messageValue: string | undefined = message

		// Remove attribute to prevent default browser tooltip
		target.setAttribute('title', message)

		let element: HTMLElement | null = null
		let autoUpdateCleanup: (() => void) | null = null
		let timeoutId: number | null = null
		const controller = new AbortController()
		const { signal } = controller

		const clearTooltipTimeout = () => {
			if (timeoutId) {
				window.clearTimeout(timeoutId)
				timeoutId = null
			}
		}

		const showTooltip = () => {
			if (element || !messageValue) {
				return
			}

			target.removeAttribute('title')

			element = element ?? getTooltipTemplate()
			element.textContent = messageValue

			document.body.appendChild(element)
			element.showPopover()

			const updatePosition = async () => {
				if (!element) {
					return
				}

				const { x, y } = await computePosition(target, element, {
					strategy: 'fixed',
					middleware: [offset(8), autoPlacement()],
				})

				element.style.left = `${x}px`
				element.style.top = `${y}px`
			}

			autoUpdateCleanup = autoUpdate(target, element, () => {
				void updatePosition()
			})
		}

		const scheduleShowTooltip = () => {
			if (element) {
				return
			}

			timeoutId = window.setTimeout(showTooltip, 300)
		}

		const hideTooltip = () => {
			clearTooltipTimeout()
			autoUpdateCleanup?.()

			// Restore the title attribute
			if (messageValue) {
				target.setAttribute('title', messageValue)
			}

			if (element) {
				element.remove()
				element = null
			}
		}

		on(target, 'pointerenter', scheduleShowTooltip, { signal })
		on(
			target,
			'focusin',
			() => {
				if (target.matches(':focus-visible')) {
					scheduleShowTooltip()
				}
			},
			{ signal },
		)

		on(target, 'pointerleave', hideTooltip, { signal })
		// Makes so tooltip is hidden just before view transitions starts
		on(target, 'pointerup', hideTooltip, { signal })
		on(target, 'focusout', hideTooltip, { signal })
		// Needed for Safari
		on(target, 'touchend', hideTooltip, { signal })

		const cleanup = () => {
			controller.abort()
			hideTooltip()
		}

		return cleanup
	}
}
