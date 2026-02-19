/**
 * Executes a UI action that shows a success message upon completion or an error message if the action fails.
 */
export const createUIAction = <P extends unknown[] = []>(
	successMessage: string | false,
	action: (...params: P) => Promise<void>,
) => {
	return async (...params: P): Promise<void> => {
		try {
			await action(...params)
			if (successMessage) {
				snackbar(successMessage)
			}
		} catch (error) {
			snackbar.unexpectedError(error)
		}
	}
}
