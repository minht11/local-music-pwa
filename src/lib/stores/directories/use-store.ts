import { getContext } from 'svelte'
import type { DirectoriesStore } from './impl.ts'

export const DIRECTORIES_STORE_CONTEXT: unique symbol = Symbol()

export const useDirectoriesStore = (): DirectoriesStore =>
	getContext<DirectoriesStore>(DIRECTORIES_STORE_CONTEXT)
