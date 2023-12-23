export interface SnackbarOptions {
	id: string
	message: (() => string) | string
	duration?: number | false
}

export const snackbar = (newSnackbar: SnackbarOptions) => newSnackbar
