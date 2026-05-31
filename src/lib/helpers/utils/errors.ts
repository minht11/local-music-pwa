/** @public */
export const isAbortError = (error: unknown): error is DOMException =>
	error instanceof DOMException && error.name === 'AbortError'

/** @public */
export const createAbortError = (message?: string) => new DOMException(message, 'AbortError')
