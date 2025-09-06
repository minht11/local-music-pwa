import { getContext } from 'svelte'
import type { YTMPlayerStore } from './ytm-player.svelte.ts'

export const PLAYER_STORE_CONTEXT: unique symbol = Symbol()

export const usePlayer = (): YTMPlayerStore => getContext<YTMPlayerStore>(PLAYER_STORE_CONTEXT)
