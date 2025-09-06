import type { SnackbarData } from './Snackbar.svelte'

// biome-ignore lint/suspicious/noExplicitAny: this can be anything
export const snackbarItems: SnackbarData<any>[] = $state([])
