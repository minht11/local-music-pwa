import type { Attachment } from 'svelte/attachments'
import { on } from 'svelte/events'
import { browser } from '$app/environment'

let tooltipTemplate: HTMLDivElement | null = null
const cloneTooltipTemplate = () => {
	if (tooltipTemplate === null) {
		tooltipTemplate = document.createElement('div')
		tooltipTemplate.setAttribute('role', 'tooltip')
		tooltipTemplate.className =
			'tooltip bg-inverseSurface max-w-80 flex items-center m-0 text-body-sm min-h-6 text-inverseOnSurface px-2 py-0.5 rounded-sm'
		tooltipTemplate.popover = 'manual'
	}

	return tooltipTemplate.cloneNode() as HTMLDivElement
}

const supportsCssAnchor = browser && CSS.supports('anchor-name', '--a')

export const tooltip = (message: string | undefined): Attachment<HTMLElement> => {
	return (target) => {
		if (!message || import.meta.env.SSR || !supportsCssAnchor) {
			return
		}

		const anchorName = `--tooltip-${crypto.randomUUID().slice(0, 4)}`

		target.setAttribute('title', message)

		let tooltipElement: HTMLElement | null = null
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
			if (tooltipElement || !message) {
				return
			}

			// Remove attribute to prevent default browser tooltip
			target.removeAttribute('title')
			// @ts-expect-error missing types
			target.style.anchorName = anchorName

			tooltipElement = cloneTooltipTemplate()
			tooltipElement.textContent = message
			// @ts-expect-error missing types
			tooltipElement.style.positionAnchor = anchorName

			document.body.appendChild(tooltipElement)
			tooltipElement.showPopover()
		}

		const scheduleShowTooltip = () => {
			if (tooltipElement) {
				return
			}

			timeoutId = window.setTimeout(showTooltip, 300)
		}

		const hideTooltip = () => {
			clearTooltipTimeout()
			// Restore the title attribute
			if (message) {
				target.setAttribute('title', message)
			}

			target.style.removeProperty('anchorName')
			if (tooltipElement) {
				tooltipElement.remove()
				tooltipElement = null
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
