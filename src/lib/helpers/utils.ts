const isMobile = () => {
	if (!window) {
		return false
	}

	if (window.navigator.userAgentData) {
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

export const assign = <T extends Record<PropertyKey, unknown>, S extends Partial<T>>(
	target: T,
	source: S,
): S & T => Object.assign(target, source)
