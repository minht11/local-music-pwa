export const safeInteger = (num: number, fallback = 0): number => {
	if (Number.isSafeInteger(num)) {
		return num
	}

	return fallback
}
