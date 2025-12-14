import { createContext } from 'svelte'
import type { PlayerStore } from './player.svelte.ts'

export const [usePlayer, setPlayerStoreContext] = createContext<PlayerStore>()
