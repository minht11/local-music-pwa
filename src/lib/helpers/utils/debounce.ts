export const debounce = <Fn extends (...args: Parameters<Fn>) => ReturnType<Fn>>(
	fn: Fn,
	delay: number,
): {
	(...args: Parameters<Fn>): void
	cancel(): void
} => {
	let timeout: undefined | number

	const debounceFn = (...args: Parameters<Fn>) => {
		clearTimeout(timeout)

		timeout = window.setTimeout(() => {
			fn(...args)
		}, delay)
	}

	debounceFn.cancel = () => {
		if (timeout) {
			timeout = undefined
			clearTimeout(timeout)
		}
	}

	return debounceFn
}
