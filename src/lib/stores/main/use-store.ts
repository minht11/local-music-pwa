import { getContext } from 'svelte'
import type { MainStore } from './store.svelte.ts'

export const MAIN_STORE_CONTEXT: unique symbol = Symbol()

export const useMainStore = (): MainStore => getContext<MainStore>(MAIN_STORE_CONTEXT)
