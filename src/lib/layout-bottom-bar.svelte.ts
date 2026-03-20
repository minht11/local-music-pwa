import { createContext } from 'svelte'
import { SvelteMap } from 'svelte/reactivity'

export interface BottomBarState {
	bottomBar: Snippet | null
	abovePlayer: SvelteMap<number, Snippet>
}

const [getContext, setContext] = createContext<BottomBarState>()

export const setupOverlaySnippets = () => {
	const state: BottomBarState = $state({
		bottomBar: null,
		abovePlayer: new SvelteMap<number, Snippet>(),
	})

	setContext(state)

	return {
		get bottomBar(): BottomBarState['bottomBar'] {
			return state.bottomBar
		},
		get abovePlayer(): Snippet[] {
			return [...state.abovePlayer.values()]
		},
	}
}

let counter = 0

export const useSetOverlaySnippet = (
	type: 'bottom-bar' | 'above-player',
	getSnippet: () => Snippet | null,
): void => {
	const state = getContext()
	const id = counter
	counter += 1

	$effect.pre(() => {
		if (type === 'bottom-bar') {
			state.bottomBar = getSnippet()

			return () => {
				state.bottomBar = null
			}
		}

		if (type === 'above-player') {
			const snippet = getSnippet()

			if (snippet) {
				state.abovePlayer.set(id, snippet)
			} else {
				state.abovePlayer.delete(id)
			}

			return () => {
				state.abovePlayer.delete(id)
			}
		}

		return undefined
	})
}
