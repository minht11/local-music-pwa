export const isMobile = () => {
	if (window.navigator.userAgentData) {
		return navigator.userAgentData.mobile
	}

	return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

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
