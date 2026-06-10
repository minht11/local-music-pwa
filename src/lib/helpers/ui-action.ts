import { lockDatabase } from '$lib/db/lock-database'

interface CreateUIActionOptions<P extends unknown[] = [], R = void> {
	/** Locks database during duration of the action */
	lockDatabase?: boolean
	successMessage: string | false | ((params: P, result: R) => string | false)
	action: (...params: P) => Promise<R>
}

/**
 * Executes a UI action that shows a success message upon completion or an error message if the action fails.
 */
export const createUIAction = <P extends unknown[] = [], R = void>(
	options: CreateUIActionOptions<P, R>,
) => {
	const wrappedAction = async (...params: P): Promise<void> => {
		try {
			const result = options.lockDatabase
				? await lockDatabase(() => options.action(...params))
				: await options.action(...params)

			const message =
				typeof options.successMessage === 'function'
					? options.successMessage(params, result)
					: options.successMessage

			if (message) {
				snackbar(message)
			}
		} catch (error) {
			console.error('Error executing UI action:', error)
			snackbar.unexpectedError(error)
		}
	}

	return wrappedAction
}
