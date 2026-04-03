const isMobileRegex = /Android|iPhone|iPad|iPod/i
const isMacRegex = /Macintosh|Mac OS X/i
const isWindowsRegex = /Windows/i
const isAndroidRegex = /Android/i

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

	return ua.includes('applewebkit') && !ua.includes('chrome') && !ua.includes('chromium')
}

/** @public */
export const isMac = (): boolean => {
	if (navigator.userAgentData?.platform) {
		return navigator.userAgentData.platform === 'macOS'
	}

	return isMacRegex.test(navigator.userAgent)
}

/** @public */
export const isWindows = (): boolean => {
	if (navigator.userAgentData?.platform) {
		return navigator.userAgentData.platform === 'Windows'
	}

	return isWindowsRegex.test(navigator.userAgent)
}

export const isAndroid = (): boolean => {
	if (navigator.userAgentData) {
		return navigator.userAgentData.platform === 'Android'
	}

	return isAndroidRegex.test(navigator.userAgent)
}

export const isChromiumBased = (): boolean => {
	// All of our supported Chromium versions will have this property
	if (navigator.userAgentData) {
		return navigator.userAgentData.brands.some((brand) =>
			brand.brand.toLowerCase().includes('chromium'),
		)
	}

	return false
}

/**
 * Returns whether the primary modifier key is pressed.
 * On Mac this is the Meta key (Cmd), on Windows/Linux it's the Ctrl key.
 * @public
 */
export const isPrimaryModifierKey = (event: KeyboardEvent | MouseEvent): boolean => {
	if (isMac()) {
		return event.metaKey
	}

	return event.ctrlKey
}
