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

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type Impossible<K extends keyof any> = {
	[P in K]: never
}

export const assign = <T extends {}, S extends Partial<T>>(
	target: T,
	source: S & Impossible<Exclude<keyof S, keyof T>>,
): S & T => Object.assign(target, source)

const twoDigits = (num: number) => (num < 10 ? `0${num}` : num)

export const formatDuration = (seconds: number) => {
	const hours = Math.floor(seconds / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)
	const secs = Math.floor(seconds % 60)

	return `${hours ? `${hours}:` : ''}${twoDigits(minutes)}:${twoDigits(secs)}`
}

export const throttle = <Fn extends (...args: Parameters<Fn>) => ReturnType<Fn>>(
	fn: Fn,
	delay: number,
) => {
	let wait = false
	let timeout: undefined | number
	let prevValue: ReturnType<Fn> | undefined = undefined

	const throttleFn = (...args: Parameters<Fn>) => {
		if (wait) {
			// prevValue always defined by the
			// time wait is true
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			return prevValue!
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

export const debounce = <Fn extends (...args: Parameters<Fn>) => ReturnType<Fn>>(
	fn: Fn,
	delay: number,
) => {
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
