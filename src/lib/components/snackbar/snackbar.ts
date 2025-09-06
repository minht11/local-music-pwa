import type { SnackbarData } from './Snackbar.svelte'
import { snackbarItems } from './store.svelte.ts'

export type SnackbarOptions<T = unknown> = SnackbarData<T>

export interface SnackbarFn<T> {
	(newSnackbar: SnackbarOptions<T> | string): void
	unexpectedError(error: unknown): void
	dismiss(id: string): void
}

const showSnackbar = <const T>(newSnackbar: SnackbarOptions<T> | string): void => {
	let newSnackbarNormalized: SnackbarData<T>
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

export const snackbar = <const T>(newSnackbar: SnackbarOptions<T> | string): void => {
	untrack(() => showSnackbar(newSnackbar))
}

snackbar.dismiss = (id: string): void => {
	const index = snackbarItems.findIndex((snackbar) => snackbar.id === id)
	if (index > -1) {
		snackbarItems.splice(index, 1)
	}
}

snackbar.unexpectedError = (error: unknown) => {
	console.error('[SNACKBAR] Unexpected error', error)
	snackbar({
		id: 'unexpected-error',
		message: m.errorUnexpected(),
		duration: 10_000,
	})
}
