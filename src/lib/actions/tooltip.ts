import { autoPlacement, autoUpdate, computePosition, offset } from '@floating-ui/dom'
import type { Action } from 'svelte/action'
import { on } from 'svelte/events'

const tooltipTemplate = document.createElement('div')
tooltipTemplate.setAttribute('role', 'tooltip')
tooltipTemplate.className =
	'tooltip-enter bg-inverseSurface text-nowrap flex items-center inset-0 m-0 text-body-sm min-h-24px text-inverseOnSurface px-8px rounded-4px'
tooltipTemplate.popover = 'manual'

export const tooltip = ((target, message?: string) => {
	if (!message) {
		return
	}

	let messageValue = message

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
		if (element) {
			return
		}

		target.removeAttribute('title')

		element = element ?? (tooltipTemplate.cloneNode() as HTMLElement)
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

		autoUpdateCleanup = autoUpdate(target, element, updatePosition)
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
	on(target, 'focusin', scheduleShowTooltip, { signal })

	on(target, 'pointerleave', hideTooltip, { signal })
	on(target, 'focusout', hideTooltip, { signal })

	return {
		update: (newMessage: string) => {
			messageValue = newMessage
			if (element && newMessage) {
				element.textContent = newMessage
			} else {
				hideTooltip()
			}
		},
		destroy: () => {
			controller.abort()
			hideTooltip()
		},
	}
}) satisfies Action<HTMLElement, string>
