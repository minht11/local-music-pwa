export const isAbortError = (error: unknown): error is DOMException =>
	error instanceof DOMException && error.name === 'AbortError'
