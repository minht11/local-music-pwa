import { getContext, setContext } from 'svelte'

import { PlayerStore } from './player.svelte'

const playerContext = Symbol('player')

export const providePlayer = (): PlayerStore => {
	const player = new PlayerStore()

	setContext(playerContext, player)

	return player
}

export const usePlayer = (): PlayerStore => {
	const player = getContext<PlayerStore>(playerContext)

	invariant(player, 'No player found')

	return player
}
