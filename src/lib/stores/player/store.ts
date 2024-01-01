import { getContext, setContext } from 'svelte'
import invariant from 'tiny-invariant'
import { PlayerStore } from './player.svelte'

const playerContext = Symbol('player')

export const providePlayer = () => {
	const player = new PlayerStore()

	setContext(playerContext, player)

	return player
}

export const usePlayer = () => {
	const player = getContext<PlayerStore>(playerContext)

	invariant(player, 'No player found')

	return player
}
