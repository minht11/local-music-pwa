/** @public */
export const isMobile = (): boolean => {
	if (navigator.userAgentData) {
		return navigator.userAgentData.mobile
	}

	return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

/** @public */
export const isSafari = () => {
	const ua = navigator.userAgent.toLowerCase()

	return ua.indexOf('safari') !== -1 && ua.indexOf('chrome') === -1
}

/** @public */
export const isMac = (): boolean => {
	if (navigator.userAgentData?.platform) {
		return navigator.userAgentData.platform === 'macOS'
	}

	return navigator.platform.toUpperCase().indexOf('MAC') >= 0
}

/** @public */
export const isWindows = (): boolean => {
	if (navigator.userAgentData?.platform) {
		return navigator.userAgentData.platform === 'Windows'
	}

	return navigator.platform.toUpperCase().indexOf('WIN') >= 0
}

/**
 * Returns whether the primary modifier key is pressed.
 * On Mac this is the Meta key (Cmd), on Windows/Linux it's the Ctrl key.
 * @public
 */
export const isPrimaryModifierKey = (event: KeyboardEvent | MouseEvent): boolean => {
	return isMac() ? event.metaKey : event.ctrlKey
}
