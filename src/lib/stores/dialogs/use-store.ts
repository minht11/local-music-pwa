import { createContext } from 'svelte'
import type { DialogsStore } from './store.svelte.ts'

export const [useDialogsStore, setDialogsStoreContext] = createContext<DialogsStore>()
