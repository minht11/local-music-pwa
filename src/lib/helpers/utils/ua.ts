const isMobileRegex = /Android|iPhone|iPad|iPod/i

/** @public */
export const isMobile = (): boolean => {
	if (navigator.userAgentData) {
		return navigator.userAgentData.mobile
	}

	return isMobileRegex.test(navigator.userAgent)
}

/** @public */
export const isSafari = () => {
	const ua = navigator.userAgent.toLowerCase()

	return ua.includes('safari')
}

/** @public */
export const isMac = (): boolean => {
	if (navigator.userAgentData?.platform) {
		return navigator.userAgentData.platform === 'macOS'
	}

	return /Mac/.test(navigator.userAgent)
}

/** @public */
export const isWindows = (): boolean => {
	if (navigator.userAgentData?.platform) {
		return navigator.userAgentData.platform === 'Windows'
	}

	return /Win/.test(navigator.userAgent)
}

/**
 * Returns whether the primary modifier key is pressed.
 * On Mac this is the Meta key (Cmd), on Windows/Linux it's the Ctrl key.
 * @public
 */
export const isPrimaryModifierKey = (event: KeyboardEvent | MouseEvent): boolean => {
	return isMac() ? event.metaKey : event.ctrlKey
}
