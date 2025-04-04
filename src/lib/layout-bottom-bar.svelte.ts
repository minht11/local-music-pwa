import { getContext, setContext } from 'svelte'

export interface BottomBarState {
	snippet: Snippet | null
}

const key = Symbol('root-layout')

export const setupBottomBar = () => {
	const state: BottomBarState = $state({
		snippet: null,
	})

	setContext(key, state)

	return {
		get snippet(): BottomBarState['snippet'] {
			return state.snippet
		},
	}
}

export const useSetBottomBar = (bottomBar: () => Snippet): void => {
	const state = getContext<BottomBarState>(key)

	$effect.pre(() => {
		state.snippet = bottomBar()

		return () => {
			state.snippet = null
		}
	})
}
