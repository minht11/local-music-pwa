import { getContext, setContext } from 'svelte'
import invariant from 'tiny-invariant'
import { PlayerStore } from './player.svelte'

const playerContext = Symbol('player')

export const providePlayer = () => {
	setContext(playerContext, new PlayerStore())
}

export const usePlayer = () => {
	const player = getContext<PlayerStore>(playerContext)

	invariant(player, 'No player found')

	return player
}
