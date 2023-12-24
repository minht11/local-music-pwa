export interface SnackbarOptions {
	id: string
	message: (() => string) | string
	duration?: number | false
	controls?: 'spinner' | false
}

export const snackbar = (newSnackbar: SnackbarOptions) => {
	// TODO.
	console.log(newSnackbar.message)
}
