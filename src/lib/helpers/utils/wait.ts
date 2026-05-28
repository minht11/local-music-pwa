const waitWithSignal = (duration: number, signal: AbortSignal): Promise<void> => {
	const { promise, resolve, reject } = Promise.withResolvers<void>()
	const signalHandler = () => {
		clearTimeout(timeoutId)
		reject(new DOMException('Aborted', 'AbortError'))
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
