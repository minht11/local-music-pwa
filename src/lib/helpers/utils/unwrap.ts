export const unwrap = <T>(value: T | (() => T)): T => {
	if (typeof value === 'function') {
		// @ts-expect-error
		return value()
	}

	return value
}
