export interface SnackbarOptions {
	id: string
	message: (() => string) | string
	duration?: number | false
	controls?: 'spinner' | false
}

export const snackbarItems: SnackbarOptions[] = $state([])
