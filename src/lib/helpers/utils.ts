const isMobile = () => {
	if (navigator.userAgentData) {
		return navigator.userAgentData.mobile
	}

	return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export const IS_DEVICE_A_MOBILE = isMobile()

export const wait = (duration: number): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve, duration)
	})

export const toggleReverseArray = <T>(items: T[], condition = false) =>
	condition ? [...items].reverse() : items
