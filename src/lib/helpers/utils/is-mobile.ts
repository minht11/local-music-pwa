export const isMobile = (): boolean => {
	if (navigator.userAgentData) {
		return navigator.userAgentData.mobile
	}

	return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}
