import { createAbortError } from './errors.ts'

const waitWithSignal = (duration: number, signal: AbortSignal): Promise<void> => {
	const { promise, resolve, reject } = Promise.withResolvers<void>()

	if (signal.aborted) {
		reject(createAbortError())
		return promise
	}

	const signalHandler = () => {
		clearTimeout(timeoutId)
		reject(createAbortError())
	}

	signal.addEventListener('abort', signalHandler, { once: true })

	const timeoutId = window.setTimeout(() => {
		signal.removeEventListener('abort', signalHandler)
		resolve()
	}, duration)

	return promise
}

/** @public */
export const wait = (duration: number, signal?: AbortSignal): Promise<void> => {
	if (signal) {
		return waitWithSignal(duration, signal)
	}

	return new Promise((resolve) => {
		window.setTimeout(resolve, duration)
	})
}
