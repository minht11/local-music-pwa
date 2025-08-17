import { untrack } from 'svelte'
import type { SnackbarData } from './Snackbar.svelte'
import { snackbarItems } from './store.svelte.ts'

export type SnackbarOptions = SnackbarData

export interface SnackbarFn {
	(newSnackbar: SnackbarOptions | string): void
	unexpectedError(error: unknown): void
}

const showSnackbar = (newSnackbar: SnackbarOptions | string): void => {
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

export const snackbar: SnackbarFn = (newSnackbar: SnackbarOptions | string): void => {
	untrack(() => showSnackbar(newSnackbar))
}

snackbar.unexpectedError = (error: unknown) => {
	console.error('[SNACKBAR] Unexpected error', error)
	snackbar({
		id: 'unexpected-error',
		message: m.errorUnexpected(),
		duration: 10_000,
	})
}
