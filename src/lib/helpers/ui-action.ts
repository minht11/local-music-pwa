import { snackbar } from '$lib/components/snackbar/snackbar'

/**
 * Executes a UI action that shows a success message upon completion or an error message if the action fails.
 */
export const createUIAction = <P = void>(
	successMessage: string,
	action: (params: P) => Promise<void>,
) => {
	return async (params: P): Promise<void> => {
		try {
			await action(params)
			snackbar(successMessage)
		} catch (error) {
			snackbar.unexpectedError(error)
		}
	}
}
