export const throttle = <Fn extends (...args: Parameters<Fn>) => ReturnType<Fn>>(
	fn: Fn,
	delay: number,
): {
	(...args: Parameters<Fn>): ReturnType<Fn>
	cancel(): void
} => {
	let wait = false
	let timeout: undefined | number
	let prevValue: ReturnType<Fn> | undefined

	const throttleFn = (...args: Parameters<Fn>) => {
		if (wait) {
			// prevValue always defined by the
			// time wait is true
			return prevValue as ReturnType<Fn>
		}

		const val = fn(...args)
		prevValue = val

		wait = true

		timeout = window.setTimeout(() => {
			wait = false
		}, delay)

		return val
	}
	throttleFn.cancel = () => {
		clearTimeout(timeout)
	}
	return throttleFn
}
