import type { SnackbarData } from './Snackbar.svelte'
import { snackbarItems } from './store.svelte'

export type SnackbarOptions = SnackbarData

export const snackbar = (newSnackbar: SnackbarOptions | string): void => {
	let newSnackbarNormalized: SnackbarData
	if (typeof newSnackbar === 'string') {
		newSnackbarNormalized = { id: newSnackbar, message: newSnackbar }
	} else {
		newSnackbarNormalized = newSnackbar
	}

	const index = snackbarItems.findIndex((snackbar) => snackbar.id === newSnackbarNormalized.id)

	if (index > -1) {
		snackbarItems[index] = newSnackbarNormalized
	} else {
		snackbarItems.push(newSnackbarNormalized)
	}
}
