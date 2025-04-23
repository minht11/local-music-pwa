/** @public */
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

		timeout = window.setTimeout(fn, delay, ...(args as unknown[]))
	}

	debounceFn.cancel = () => {
		if (timeout) {
			clearTimeout(timeout)
			timeout = undefined
		}
	}

	return debounceFn
}
