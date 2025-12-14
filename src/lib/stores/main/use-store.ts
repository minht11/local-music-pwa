import { createContext } from 'svelte'
import type { MainStore } from './store.svelte.ts'

export const [useMainStore, setMainStoreContext] = createContext<MainStore>()
