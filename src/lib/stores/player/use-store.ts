import { getContext } from 'svelte'
import type { PlayerStore } from './player.svelte.ts'

export const PLAYER_STORE_CONTEXT: unique symbol = Symbol()

export const usePlayer = (): PlayerStore => getContext<PlayerStore>(PLAYER_STORE_CONTEXT)
