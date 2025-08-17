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
